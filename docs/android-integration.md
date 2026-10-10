# Android app changes for admin analytics

> **Canonical version:** `docs/android-app-prompt.md` on the `backend` branch
> is the up-to-date, ready-to-paste task description for the Android repo. It
> adds what this overview omits: the optional `X-Scritto-App-Key` header
> (`SCRITTO_APP_KEY`), the FCM topic `all`, the `scritto_announcements`
> notification channel, and how to handle 422 responses.

The admin site can only show what the Scritto app sends. Today the app stores
everything locally (`ScrittoStore`), has no login and makes no backend calls,
so nothing reaches the admin. This document lists the app changes needed.

The model is **anonymous installations**: no login, no accounts. Each install
gets a random ID and sends usage *events* (names only) to FastAPI.

> The Kotlin below follows the app's existing style (SharedPreferences +
> `org.json`, `HttpURLConnection` like `GeminiClient`, WorkManager which is
> already a dependency). It is a starting point and hasn't been compiled
> against the project.

## Privacy rules (read first)

- Never send note, task, schedule, document or AI-chat **content**, file names, or URIs.
  Only event names plus small enums (e.g. `kind: "pdf"`).
- No advertising ID, IMEI, Android ID, email, or account info. The installation ID is a random UUID.
- Add an "Anonymous usage statistics" switch in the app (on by default is fine,
  but it must be possible to turn off) and a privacy policy link.
- Declare "App interactions" and "Device or other IDs" in the Play Console **Data safety** form.

## Checklist

| # | Change | Where |
|---|---|---|
| 1 | Add `SCRITTO_API_URL` → `BuildConfig.SCRITTO_API_URL` | `app/build.gradle.kts`, `.env.example` |
| 2 | Installation ID + event queue | new `telemetry/Telemetry.kt` |
| 3 | HTTP helper for the backend | new `telemetry/ScrittoApi.kt` |
| 4 | Background upload (register + send events) | new `telemetry/TelemetryWorker.kt` |
| 5 | Initialise telemetry and track `app_opened` | `MainActivity.onCreate` |
| 6 | Track feature events | `ScrittoStore`, `ScrittoAssistant`, `VoiceAssistantOverlay`, document screens |
| 7 | Opt-out switch + privacy policy link | a settings/about screen |
| 8 | Read remote config at launch | new `config/RemoteConfig.kt` (optional, phase 2) |
| 9 | Firebase Cloud Messaging for push | phase 2, needed for the Notifications page |
| 10 | Move Gemini keys off the device | phase 2, security |

Nothing in `AndroidManifest.xml` needs to change for 1–8: `INTERNET` is already declared.

### 1. Backend URL in BuildConfig

In `app/build.gradle.kts`, next to `geminiApiKeys`:

```kotlin
val scrittoApiUrl: String = secret("SCRITTO_API_URL").trim().trimEnd('/')
    .ifEmpty { "http://10.0.2.2:8000/api/v1" } // emulator → localhost FastAPI
```

and inside `defaultConfig { }`:

```kotlin
buildConfigField("String", "SCRITTO_API_URL", "\"$scrittoApiUrl\"")
```

Add to `.env.example`: `SCRITTO_API_URL=https://api.scritto.app/api/v1`. It isn't a secret.

For local HTTP testing against `10.0.2.2`, debug builds need cleartext allowed
for that host (a `network_security_config` in `src/debug`). Production must use HTTPS.

### 2. `telemetry/Telemetry.kt`: installation ID + offline queue

```kotlin
package com.internship.scritto.telemetry

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject
import java.time.Instant
import java.util.UUID

object Telemetry {
    private const val PREFS = "scritto_telemetry"
    private const val KEY_ID = "installation_id"
    private const val KEY_QUEUE = "queue"
    private const val KEY_ENABLED = "enabled"
    private const val MAX_QUEUE = 500

    private lateinit var prefs: SharedPreferences

    fun init(context: Context) {
        ensure(context)
        TelemetryWorker.schedule(context)
    }

    /** The worker can run in a fresh process where MainActivity never started. */
    @Synchronized
    internal fun ensure(context: Context) {
        if (!::prefs.isInitialized) prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    val installationId: String
        get() = prefs.getString(KEY_ID, null)
            ?: UUID.randomUUID().toString().also { prefs.edit().putString(KEY_ID, it).apply() }

    var enabled: Boolean
        get() = prefs.getBoolean(KEY_ENABLED, true)
        set(value) {
            prefs.edit().putBoolean(KEY_ENABLED, value).apply()
            if (!value) prefs.edit().remove(KEY_QUEUE).apply()
        }

    /** Queue an event. Cheap and safe to call from the UI thread. */
    @Synchronized
    fun track(name: String, properties: Map<String, Any> = emptyMap()) {
        if (!::prefs.isInitialized || !enabled) return
        val queue = JSONArray(prefs.getString(KEY_QUEUE, "[]"))
        if (queue.length() >= MAX_QUEUE) return
        queue.put(
            JSONObject()
                .put("name", name)
                .put("occurred_at", Instant.now().toString())
                .put("properties", JSONObject(properties))
        )
        prefs.edit().putString(KEY_QUEUE, queue.toString()).apply()
    }

    @Synchronized
    internal fun peek(max: Int = 100): JSONArray {
        val queue = JSONArray(prefs.getString(KEY_QUEUE, "[]"))
        return JSONArray().apply { for (i in 0 until minOf(max, queue.length())) put(queue.get(i)) }
    }

    /** Drop the first [count] events after a successful upload. */
    @Synchronized
    internal fun drop(count: Int) {
        val queue = JSONArray(prefs.getString(KEY_QUEUE, "[]"))
        val rest = JSONArray().apply { for (i in count until queue.length()) put(queue.get(i)) }
        prefs.edit().putString(KEY_QUEUE, rest.toString()).apply()
    }

    internal var registeredVersion: String?
        get() = prefs.getString("registered_version", null)
        set(value) { prefs.edit().putString("registered_version", value).apply() }
}
```

### 3. `telemetry/ScrittoApi.kt`: minimal JSON POST

```kotlin
package com.internship.scritto.telemetry

import com.internship.scritto.BuildConfig
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object ScrittoApi {
    /** Returns true on a 2xx response. Call from a background thread only. */
    fun post(path: String, body: JSONObject): Boolean {
        val connection = URL(BuildConfig.SCRITTO_API_URL + path).openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "POST"
            connection.connectTimeout = 10_000
            connection.readTimeout = 15_000
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.use { it.write(body.toString().toByteArray()) }
            connection.responseCode in 200..299
        } catch (e: Exception) {
            false
        } finally {
            connection.disconnect()
        }
    }
}
```

### 4. `telemetry/TelemetryWorker.kt`: register + upload in the background

```kotlin
package com.internship.scritto.telemetry

import android.content.Context
import android.os.Build
import androidx.work.*
import com.internship.scritto.BuildConfig
import org.json.JSONObject
import java.util.Locale
import java.util.concurrent.TimeUnit

class TelemetryWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        Telemetry.ensure(applicationContext)
        if (!Telemetry.enabled) return Result.success()

        // (Re)register once per app version so the admin sees model / OS / version.
        if (Telemetry.registeredVersion != BuildConfig.VERSION_NAME) {
            val device = JSONObject()
                .put("installation_id", Telemetry.installationId)
                .put("platform", "android")
                .put("manufacturer", Build.MANUFACTURER)
                .put("model", Build.MODEL)
                .put("os_version", "Android ${Build.VERSION.RELEASE}")
                .put("sdk_int", Build.VERSION.SDK_INT)
                .put("app_version", BuildConfig.VERSION_NAME)
                .put("app_build", BuildConfig.VERSION_CODE)
                .put("locale", Locale.getDefault().toLanguageTag())
            if (!ScrittoApi.post("/devices/register", device)) return Result.retry()
            Telemetry.registeredVersion = BuildConfig.VERSION_NAME
        }

        while (true) {
            val batch = Telemetry.peek()
            if (batch.length() == 0) return Result.success()
            val body = JSONObject()
                .put("installation_id", Telemetry.installationId)
                .put("app_version", BuildConfig.VERSION_NAME)
                .put("events", batch)
            if (!ScrittoApi.post("/events", body)) return Result.retry()
            Telemetry.drop(batch.length())
        }
    }

    companion object {
        private val online = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()

        fun schedule(context: Context) {
            val wm = WorkManager.getInstance(context)
            // Upload soon after launch...
            wm.enqueueUniqueWork(
                "telemetry-now", ExistingWorkPolicy.REPLACE,
                OneTimeWorkRequestBuilder<TelemetryWorker>()
                    .setConstraints(online)
                    .setInitialDelay(30, TimeUnit.SECONDS)
                    .build()
            )
            // ...and periodically for events queued while the app was in use.
            wm.enqueueUniquePeriodicWork(
                "telemetry-periodic", ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<TelemetryWorker>(6, TimeUnit.HOURS).setConstraints(online).build()
            )
        }
    }
}
```

### 5. `MainActivity.onCreate`

Right after the existing `ScrittoStore.initialize(applicationContext)`:

```kotlin
Telemetry.init(applicationContext)
if (savedInstanceState == null) Telemetry.track("app_opened")
```

### 6. Feature events

Add one `Telemetry.track(...)` line at each point:

| Event name | Properties | Where |
|---|---|---|
| `note_created` | none | `ScrittoStore.createNote()` |
| `task_created` | none | `ScrittoStore.createTask(...)` |
| `task_completed` | none | `ScrittoStore.setTaskCompleted(...)` when it's set to completed |
| `event_scheduled` | none | `ScrittoStore.createScheduleEvent(...)` |
| `document_opened` | `kind`: `DocumentKind.name.lowercase()` (`pdf`, `docx`, `xlsx`, `image`, …) | where a `DocumentDescriptor` is opened (the `DOCUMENT_ROUTE` / `DOCUMENT_EDITOR_ROUTE` screens) |
| `ai_message_sent` | `voice`: Boolean | `ScrittoAssistant.respond(...)` |
| `voice_assistant_used` | none | `VoiceAssistantOverlay.startListening()` |
| `file_imported` | `kind` | `ScrittoStore.addImportedFile(...)` (optional) |

Use these exact snake_case names. The admin shows them as "Note created" and so on.
Add more later as needed, but never put user content in properties.

### 7. Opt-out switch

Bind a switch to `Telemetry.enabled` (label: "Share anonymous usage statistics"),
plus a link to the privacy policy. Turning it off clears the unsent queue.

### 8. Remote config (phase 2)

On launch, `GET {SCRITTO_API_URL}/config` and cache it in SharedPreferences.
The response is `{ "entries": [{ "key": "...", "value": ... }] }`. Useful keys:
`maintenance_mode`, `min_supported_version`, `latest_version`,
`feature_ai_assistant`, `telemetry_enabled` (a remote kill switch for step 2).
Admins edit these on the admin Settings page.

### 9. Push notifications (phase 2)

The admin Notifications page sends through the backend via **Firebase Cloud
Messaging**. The app currently only has local reminders. To receive pushes:
add a Firebase project + `google-services.json`, the `firebase-messaging`
dependency, a `FirebaseMessagingService`, and send the FCM token as
`"push_token"` in `POST /devices/register` (and again from `onNewToken`).
The Firebase **server** key/service account lives only on the backend.

### 10. Gemini keys (security)

`BuildConfig.GEMINI_API_KEYS` is compiled into the APK, so anyone can extract it
from a release build. Once FastAPI is up, route assistant calls through it
(e.g. `POST /ai/chat`) and keep the keys on the server only.

## Request formats the backend must accept

`POST /api/v1/devices/register` (upsert by `installation_id`, sets `last_seen_at`):

```json
{
  "installation_id": "8e3a996b-df6e-403c-a18a-b6bb38128f30",
  "platform": "android",
  "manufacturer": "Google",
  "model": "Pixel 9",
  "os_version": "Android 15",
  "sdk_int": 35,
  "app_version": "1.5",
  "app_build": 5,
  "locale": "en-IN",
  "push_token": null
}
```

`POST /api/v1/events` (max ~100 events per request):

```json
{
  "installation_id": "8e3a996b-df6e-403c-a18a-b6bb38128f30",
  "app_version": "1.5",
  "events": [
    { "name": "app_opened", "occurred_at": "2026-10-10T12:00:00Z", "properties": {} },
    { "name": "document_opened", "occurred_at": "2026-10-10T12:01:10Z", "properties": { "kind": "pdf" } }
  ]
}
```

These two endpoints have no login, so the backend should:
- validate shapes, cap batch size and property sizes, and allow only known event names (or `^[a-z0-9_]{1,64}$`);
- rate-limit per IP and per `installation_id`;
- auto-register unknown installation IDs on `/events`, and update `last_seen_at`;
- treat the numbers as approximate (anyone can call a public endpoint); that's normal for app analytics.
