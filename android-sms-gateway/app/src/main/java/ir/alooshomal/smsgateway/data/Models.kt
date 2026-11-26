package ir.alooshomal.smsgateway.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class ApiEnvelope<T>(
    val success: Boolean = false,
    val data: T? = null,
    val message: String? = null,
)

@Serializable
data class PairRequest(
    val code: String,
    val deviceName: String,
    val platform: String = "ANDROID",
    val appVersion: String,
)

@Serializable
data class DeviceSummary(
    val id: String,
    val name: String,
)

@Serializable
data class WorkspaceSummary(
    val id: String,
    val name: String,
)

@Serializable
data class CardSummary(
    val cardNumber: String,
    val cardLast4: String,
    val holderName: String,
)

@Serializable
data class PairResponse(
    val token: String,
    val device: DeviceSummary,
    val workspace: WorkspaceSummary,
    val card: CardSummary,
)

@Serializable
data class DeviceMeResponse(
    val device: DeviceSummary,
    val workspace: WorkspaceSummary? = null,
    val card: CardSummary? = null,
    val pendingOrders: Int = 0,
    val transactions: List<DeviceTransaction> = emptyList(),
)

@Serializable
data class DeviceTransaction(
    val id: String,
    val amount: Int,
    val status: String,
    val bankName: String? = null,
    val orderId: String? = null,
    val orderNumber: String? = null,
    val note: String? = null,
    val createdAt: String,
)

@Serializable
data class ReportSmsRequest(
    val rawText: String,
    val amount: Int,
    val destinationLast4: String? = null,
    val destinationCard: String? = null,
    val bankName: String? = null,
    val senderName: String? = null,
    val trackingNumber: String? = null,
    val smsId: String? = null,
    val smsReceivedAt: String? = null,
)

@Serializable
data class ReportSmsResponse(
    val duplicate: Boolean = false,
    val id: String? = null,
    val status: String? = null,
    val orderId: String? = null,
    val orderNumber: String? = null,
    val message: String? = null,
)

@Serializable
data class HeartbeatRequest(
    val appVersion: String,
)

@Serializable
data class SimpleResponse(
    val ok: Boolean = true,
)

@Serializable
data class ApiErrorBody(
    val success: Boolean = false,
    @SerialName("statusCode") val statusCode: Int? = null,
    val message: String? = null,
)
