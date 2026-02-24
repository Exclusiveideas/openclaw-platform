type AuditEvent =
  | { action: "api_key.added"; provider: string; userId: string }
  | { action: "api_key.removed"; provider: string; userId: string }
  | { action: "task.deleted"; taskId: string; userId: string }
  | { action: "instance.provisioned"; userId: string }
  | {
      action: "webhook.received";
      type: string;
      whopUserId: string | undefined;
    };

export function auditLog(event: AuditEvent) {
  console.log(
    JSON.stringify({ audit: true, ts: new Date().toISOString(), ...event }),
  );
}
