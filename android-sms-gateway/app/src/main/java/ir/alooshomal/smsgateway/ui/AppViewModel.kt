package ir.alooshomal.smsgateway.ui

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import ir.alooshomal.smsgateway.BuildConfig
import ir.alooshomal.smsgateway.data.ApiClient
import ir.alooshomal.smsgateway.data.ApiException
import ir.alooshomal.smsgateway.data.AppSettings
import ir.alooshomal.smsgateway.data.DeviceTransaction
import ir.alooshomal.smsgateway.sms.SmsInboxReader
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class UiState(
    val loading: Boolean = true,
    val busy: Boolean = false,
    val paired: Boolean = false,
    val serverUrl: String = AppSettings.DEFAULT_SERVER_URL,
    val deviceName: String = "",
    val workspaceName: String = "",
    val cardMasked: String = "",
    val pendingOrders: Int = 0,
    val transactions: List<DeviceTransaction> = emptyList(),
    val error: String? = null,
    val info: String? = null,
)

class AppViewModel(application: Application) : AndroidViewModel(application) {

    private val settings = AppSettings(application)
    private val api = ApiClient(BuildConfig.VERSION_NAME)

    private val _state = MutableStateFlow(UiState())
    val state: StateFlow<UiState> = _state.asStateFlow()

    init {
        _state.update {
            it.copy(
                loading = false,
                paired = settings.isPaired,
                serverUrl = settings.serverUrl,
                deviceName = settings.deviceName,
                workspaceName = settings.workspaceName,
                cardMasked = settings.cardMasked,
            )
        }
        if (settings.isPaired) refresh()
    }

    fun pair(serverUrl: String, code: String, deviceName: String) {
        val normalized = ApiClient.normalizeBaseUrl(serverUrl)
        if (code.trim().length < 6) {
            _state.update { it.copy(error = "کد اتصال را کامل وارد کنید.") }
            return
        }
        if (deviceName.trim().length < 2) {
            _state.update { it.copy(error = "یک نام برای این گوشی وارد کنید.") }
            return
        }
        viewModelScope.launch {
            _state.update { it.copy(busy = true, error = null, info = null) }
            try {
                val response = api.pair(normalized, code, deviceName)
                settings.savePairing(
                    serverUrl = normalized,
                    token = response.token,
                    deviceName = response.device.name,
                    workspaceName = response.workspace.name,
                    cardMasked = response.card.cardNumber,
                    cardLast4 = response.card.cardLast4,
                )
                _state.update {
                    it.copy(
                        busy = false,
                        paired = true,
                        serverUrl = normalized,
                        deviceName = response.device.name,
                        workspaceName = response.workspace.name,
                        cardMasked = response.card.cardNumber,
                        info = "گوشی با موفقیت به «${response.workspace.name}» متصل شد.",
                    )
                }
                backfillInbox()
                refresh()
            } catch (error: ApiException) {
                _state.update {
                    it.copy(busy = false, error = error.message ?: "اتصال ناموفق بود")
                }
            }
        }
    }

    fun refresh() {
        val token = settings.deviceToken ?: return
        viewModelScope.launch {
            _state.update { it.copy(busy = true, error = null) }
            try {
                val me = api.me(settings.serverUrl, token)
                settings.workspaceName = me.workspace?.name.orEmpty()
                settings.cardMasked = me.card?.cardNumber.orEmpty()
                settings.cardLast4 = me.card?.cardLast4.orEmpty()
                _state.update {
                    it.copy(
                        busy = false,
                        paired = true,
                        workspaceName = me.workspace?.name.orEmpty(),
                        cardMasked = me.card?.cardNumber.orEmpty(),
                        pendingOrders = me.pendingOrders,
                        transactions = me.transactions,
                    )
                }
                runCatching { api.heartbeat(settings.serverUrl, token) }
            } catch (error: ApiException) {
                _state.update {
                    it.copy(
                        busy = false,
                        error = if (error.statusCode == 401) {
                            "اتصال این گوشی از پنل قطع شده است؛ دوباره متصل شوید."
                        } else {
                            error.message ?: "دریافت وضعیت ناموفق بود"
                        },
                    )
                }
            }
        }
    }

    fun syncInbox() {
        val count = backfillInbox()
        _state.update {
            it.copy(
                info = if (count > 0) {
                    "$count پیامک واریز برای بررسی به سرور ارسال شد."
                } else {
                    "پیامک واریز تازه‌ای پیدا نشد."
                },
            )
        }
    }

    private fun backfillInbox(): Int {
        val context = getApplication<Application>()
        if (!SmsInboxReader.hasReadPermission(context)) return 0
        return SmsInboxReader.backfill(context)
    }

    fun unpair() {
        settings.clearPairing()
        _state.update {
            UiState(
                loading = false,
                paired = false,
                serverUrl = settings.serverUrl,
                deviceName = settings.deviceName,
            )
        }
    }

    fun clearMessages() {
        _state.update { it.copy(error = null, info = null) }
    }
}
