package ir.alooshomal.smsgateway.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.KSerializer
import kotlinx.serialization.json.Json
import okhttp3.HttpUrl.Companion.toHttpUrlOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class ApiException(message: String, val statusCode: Int = 0) : Exception(message)

/**
 * Thin, dependency-light client for the Alooshomal SMS-gateway API.
 *
 * The server wraps every success in `{ success, data }` and every failure in
 * `{ success: false, message }`, so all parsing goes through one place.
 */
class ApiClient(private val appVersion: String) {

    private val json = Json {
        ignoreUnknownKeys = true
        explicitNulls = false
    }

    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    suspend fun pair(
        serverUrl: String,
        code: String,
        deviceName: String,
    ): PairResponse = post(
        baseUrl = normalizeBaseUrl(serverUrl),
        path = "/sms-gateway/device/pair",
        token = null,
        body = json.encodeToString(
            PairRequest.serializer(),
            PairRequest(
                code = code.trim().uppercase(),
                deviceName = deviceName.trim(),
                appVersion = appVersion,
            ),
        ),
        deserializer = PairResponse.serializer(),
    )

    suspend fun me(serverUrl: String, token: String): DeviceMeResponse = get(
        baseUrl = normalizeBaseUrl(serverUrl),
        path = "/sms-gateway/device/me",
        token = token,
        deserializer = DeviceMeResponse.serializer(),
    )

    suspend fun report(
        serverUrl: String,
        token: String,
        payload: ReportSmsRequest,
    ): ReportSmsResponse = post(
        baseUrl = normalizeBaseUrl(serverUrl),
        path = "/sms-gateway/device/transactions",
        token = token,
        body = json.encodeToString(ReportSmsRequest.serializer(), payload),
        deserializer = ReportSmsResponse.serializer(),
    )

    suspend fun heartbeat(serverUrl: String, token: String) {
        post(
            baseUrl = normalizeBaseUrl(serverUrl),
            path = "/sms-gateway/device/heartbeat",
            token = token,
            body = json.encodeToString(
                HeartbeatRequest.serializer(),
                HeartbeatRequest(appVersion),
            ),
            deserializer = SimpleResponse.serializer(),
        )
    }

    private suspend fun <T> get(
        baseUrl: String,
        path: String,
        token: String,
        deserializer: KSerializer<T>,
    ): T = execute(
        request = Request.Builder()
            .url(baseUrl + path)
            .get()
            .header("Accept", "application/json")
            .header("User-Agent", userAgent())
            .header("Authorization", "Bearer $token")
            .build(),
        deserializer = deserializer,
    )

    private suspend fun <T> post(
        baseUrl: String,
        path: String,
        token: String?,
        body: String,
        deserializer: KSerializer<T>,
    ): T {
        val builder = Request.Builder()
            .url(baseUrl + path)
            .post(body.toRequestBody(JSON_MEDIA_TYPE))
            .header("Accept", "application/json")
            .header("User-Agent", userAgent())
        if (!token.isNullOrBlank()) {
            builder.header("Authorization", "Bearer $token")
        }
        return execute(builder.build(), deserializer)
    }

    private suspend fun <T> execute(
        request: Request,
        deserializer: KSerializer<T>,
    ): T = withContext(Dispatchers.IO) {
        try {
            client.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty()
                if (!response.isSuccessful) {
                    val message = runCatching {
                        json.decodeFromString(ApiErrorBody.serializer(), text).message
                    }.getOrNull()
                    throw ApiException(
                        message?.takeIf { it.isNotBlank() }
                            ?: "خطای سرور (${response.code})",
                        response.code,
                    )
                }
                val envelope = json.decodeFromString(
                    ApiEnvelope.serializer(deserializer),
                    text,
                )
                envelope.data ?: throw ApiException(
                    envelope.message?.takeIf { it.isNotBlank() }
                        ?: "پاسخ نامعتبر از سرور",
                )
            }
        } catch (error: ApiException) {
            throw error
        } catch (error: IOException) {
            throw ApiException(
                "ارتباط با سرور برقرار نشد. اینترنت و آدرس سرور را بررسی کنید.",
            )
        }
    }

    private fun userAgent(): String =
        "AlooshomalSmsGateway/$appVersion (Android)"

    companion object {
        private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

        /** Accepts `example.com`, `https://example.com` or `https://example.com/api`. */
        fun normalizeBaseUrl(input: String): String {
            var value = input.trim()
            if (value.isEmpty()) return AppSettings.DEFAULT_SERVER_URL
            if (!value.startsWith("http://") && !value.startsWith("https://")) {
                value = "https://$value"
            }
            value = value.trimEnd('/')
            val parsed = value.toHttpUrlOrNull()
            if (parsed != null && parsed.encodedPath.trim('/').isEmpty()) {
                value = "$value/api"
            }
            return value
        }
    }
}
