# ⏰ Windows Scheduled Task Setup

To ensure your notifications (Leads, Quotations, Projects, Services) fire automatically at a fixed time each day without anyone opening the dashboard, follow these steps to set up a Windows Task Scheduler task.

### **Step 1: Open Task Scheduler**
1.  Press `Win + R`, type `taskschd.msc`, and press **Enter**.
2.  On the right panel, click **Create Basic Task...**.

### **Step 2: "General" Details**
1.  **Name**: `PMS Daily Notification Cron`
2.  **Description**: `Triggers the daily PMS notification dispatcher for Leads, Quotes, Projects, and Services.`
3.  Click **Next**.

### **Step 3: "Trigger" (The Fixed Time)**
1.  Select **Daily** and click **Next**.
2.  **Start Date**: Leave as today.
3.  **Time**: Set your preferred fixed time (e.g., **09:15:00 AM**).
4.  **Recur every**: 1 days.
5.  Click **Next**.

### **Step 4: "Action"**
1.  Select **Start a program** and click **Next**.
2.  **Program/script**: `powershell`
3.  **Add arguments (copy the line below)**:
    ```powershell
    -WindowStyle Hidden -Command "Invoke-WebRequest -Uri 'http://localhost:3000/api/cron/dispatch-all' -UseBasicParsing"
    ```
    *(Note: If your PMS runs on a different port or URL, change `http://localhost:3000` accordingly).*
4.  Click **Next**.

### **Step 5: Finish**
1.  Review the summary and click **Finish**.
2.  **Test It**: Find your task in the list, right-click it, and select **Run**. 
3.  Check your terminal/logs—you should see `[Cron] Starting global dispatch...`.

---

### **Why this is better?**
-   **Reliable**: It doesn't matter if an admin is logged in or not.
-   **Single Pulse**: All reminders (Email & WhatsApp) go out in one batch at your chosen time.
-   **Cleaner UI**: Your dashboard is now faster because it no longer has to calculate and fire alerts every time you refresh a page.
