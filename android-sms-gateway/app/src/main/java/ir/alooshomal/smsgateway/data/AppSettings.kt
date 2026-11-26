package ir.alooshomal.smsgateway.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKeys

/**
 * Local, encrypted storage for the pairing token and the small amount of
 * business metadata the UI shows offline. The token never leaves the device
 * except in the Authorization header of our own API calls.
 */
class AppSettings(context: Context) {

    private val prefs: SharedPreferences = run {
        val masterKeyAlias = MasterKeys.getOrCreate(MasterKeys.AES256_GCM_SPEC)
        EncryptedSharedPreferences.create(
            "alooshomal_sms_gateway",
            masterKeyAlias,
            context,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    var serverUrl: String
        get() = prefs.getString(KEY_SERVER_URL, DEFAULT_SERVER_URL) ?: DEFAULT_SERVER_URL
        set(value) = prefs.edit().putString(KEY_SERVER_URL, value.trim()).apply()

    var deviceToken: String?
        get() = prefs.getString(KEY_DEVICE_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_DEVICE_TOKEN, value).apply()

    var deviceName: String
        get() = prefs.getString(KEY_DEVICE_NAME, "") ?: ""
        set(value) = prefs.edit().putString(KEY_DEVICE_NAME, value.trim()).apply()

    var workspaceName: String
        get() = prefs.getString(KEY_WORKSPACE_NAME, "") ?: ""
        set(value) = prefs.edit().putString(KEY_WORKSPACE_NAME, value).apply()

    var cardMasked: String
        get() = prefs.getString(KEY_CARD_MASKED, "") ?: ""
        set(value) = prefs.edit().putString(KEY_CARD_MASKED, value).apply()

    var cardLast4: String
        get() = prefs.getString(KEY_CARD_LAST4, "") ?: ""
        set(value) = prefs.edit().putString(KEY_CARD_LAST4, value).apply()

    val isPaired: Boolean
        get() = !deviceToken.isNullOrBlank()

    fun savePairing(
        serverUrl: String,
        token: String,
        deviceName: String,
        workspaceName: String,
        cardMasked: String,
        cardLast4: String,
    ) {
        prefs.edit()
            .putString(KEY_SERVER_URL, serverUrl.trim())
            .putString(KEY_DEVICE_TOKEN, token)
            .putString(KEY_DEVICE_NAME, deviceName.trim())
            .putString(KEY_WORKSPACE_NAME, workspaceName)
            .putString(KEY_CARD_MASKED, cardMasked)
            .putString(KEY_CARD_LAST4, cardLast4)
            .apply()
    }

    fun clearPairing() {
        prefs.edit()
            .remove(KEY_DEVICE_TOKEN)
            .remove(KEY_WORKSPACE_NAME)
            .remove(KEY_CARD_MASKED)
            .remove(KEY_CARD_LAST4)
            .apply()
    }

    companion object {
        const val DEFAULT_SERVER_URL = "https://alooshomal.ir/api"
        private const val KEY_SERVER_URL = "server_url"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_DEVICE_NAME = "device_name"
        private const val KEY_WORKSPACE_NAME = "workspace_name"
        private const val KEY_CARD_MASKED = "card_masked"
        private const val KEY_CARD_LAST4 = "card_last4"
    }
}
