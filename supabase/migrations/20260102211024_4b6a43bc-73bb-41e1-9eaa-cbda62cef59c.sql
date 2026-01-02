-- Insert default KVA reminder email template
INSERT INTO notification_templates (channel, trigger, subject, body, active)
VALUES (
  'EMAIL',
  'KVA_REMINDER',
  'Erinnerung: Kostenvoranschlag für Auftrag {{ticket_number}} läuft bald ab',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .warning-box { background: #fff3cd; border: 1px solid #ffc107; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center; }
    .info-box { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
    .footer { font-size: 12px; color: #666; padding: 20px; border-top: 1px solid #eee; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Telya Reparaturservice</h1>
  </div>
  <div class="content">
    <p>Sehr geehrte/r {{customer_name}},</p>
    
    <div class="warning-box">
      <h2>⏰ Ihr Kostenvoranschlag läuft bald ab!</h2>
      <p>Der KVA für Ihren Auftrag <strong>{{ticket_number}}</strong> ist noch bis zum <strong>{{valid_until}}</strong> gültig.</p>
    </div>
    
    <div class="info-box">
      <strong>Gerät:</strong> {{device_info}}<br>
      <strong>Geschätzte Kosten:</strong> {{estimated_price}} €
    </div>
    
    <p>Bitte bestätigen oder lehnen Sie den Kostenvoranschlag ab, damit wir Ihren Auftrag weiter bearbeiten können:</p>
    <p style="text-align: center;">
      <a href="{{tracking_url}}" class="btn">KVA jetzt bestätigen</a>
    </p>
    
    <p>Falls Sie Fragen haben, antworten Sie einfach auf diese E-Mail oder rufen Sie uns an.</p>
    <p>Mit freundlichen Grüßen,<br>Ihr Telya Team</p>
  </div>
  <div class="footer">
    <p>Telya GmbH | Diese E-Mail wurde automatisch generiert.</p>
  </div>
</body>
</html>',
  true
);