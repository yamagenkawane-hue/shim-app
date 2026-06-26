import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { measurementLabels, measurementUnits, rowTypeLabels, type MeasurementRowInput } from "@/lib/types";
import { sendLinePushMessage } from "@/lib/notifications/line";

type CreateMeasurementNotificationInput = {
  measurementSetId: string;
  customerId: string;
  productId: string;
  customerName: string;
  productName: string;
  rows: MeasurementRowInput[];
  createdByUserId: string;
};

export async function createMeasurementSavedNotifications(input: CreateMeasurementNotificationInput) {
  const supabase = createSupabaseServiceClient();
  const { data: admins, error: adminsError } = await supabase
    .from("app_users")
    .select("id, display_name, role, line_user_id")
    .eq("role", "admin")
    .eq("is_active", true);
  if (adminsError) throw adminsError;

  const { data: creator, error: creatorError } = await supabase
    .from("app_users")
    .select("id, display_name, role, line_user_id")
    .eq("id", input.createdByUserId)
    .maybeSingle();
  if (creatorError) throw creatorError;

  const recipients = uniqueRecipients([...(admins ?? []), ...(creator ? [creator] : [])]);
  const title = "測定データが登録されました";
  const body = buildMeasurementNotificationBody(input);

  for (const recipient of recipients) {
    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        recipient_user_id: recipient.id,
        recipient_role: recipient.role,
        channel: "line",
        title,
        body,
        payload: {
          measurementSetId: input.measurementSetId,
          customerId: input.customerId,
          productId: input.productId,
          customerName: input.customerName,
          productName: input.productName,
        },
        status: recipient.line_user_id ? "pending" : "skipped",
        error_message: recipient.line_user_id ? null : "LINE userIdが未設定です。",
      })
      .select("id")
      .single();
    if (error) throw error;

    if (!recipient.line_user_id) continue;
    const result = await sendLinePushMessage(recipient.line_user_id, `${title}\n\n${body}`);
    await supabase
      .from("notifications")
      .update({
        status: result.sent ? "sent" : "failed",
        error_message: result.error || null,
        sent_at: result.sent ? new Date().toISOString() : null,
      })
      .eq("id", notification.id);
  }
}

function buildMeasurementNotificationBody(input: CreateMeasurementNotificationInput) {
  const rowText = input.rows
    .map((row) => {
      const label = `${rowTypeLabels[row.rowType]}${row.rowType === "reverse_flat" ? ` ${row.rowIndex}` : ""}`;
      const values = Object.entries(row.values)
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => {
          const measurementKey = key as keyof typeof measurementLabels;
          return `${measurementLabels[measurementKey]} ${value}${measurementUnits[measurementKey]}`;
        })
        .join(" / ");
      return `${label}: ${values}`;
    })
    .join("\n");

  return [`得意先: ${input.customerName}`, `製品: ${input.productName}`, "", rowText].join("\n");
}

function uniqueRecipients<T extends { id: string }>(users: T[]) {
  const map = new Map<string, T>();
  for (const user of users) map.set(user.id, user);
  return [...map.values()];
}
