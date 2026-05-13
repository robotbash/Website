# Admin Guide

This guide covers the most common admin tasks.

---

## Adding a New Employee

1. Go to **Admin > Employees > Add employee**.
2. Fill in the employee's full name, email, role, annual PTO hours, and hire date.
3. Click **Send invite**.

The employee receives an email with a setup link. The link expires in 48 hours. They click it, set a password, and they're in.

If the link expires before they use it, have them use the "Forgot Password" flow on the login page.

---

## Reviewing Punch Corrections

When an employee submits a correction request, it shows up in **Admin > Corrections** under the Pending tab.

1. Open the correction.
2. Review the requested clock-in and clock-out times. You can edit them if needed.
3. Add an optional note (the employee sees this).
4. Click **Approve** or **Deny**.

If approved, the time entry is created or updated automatically.

---

## Adjusting PTO Balances

1. Go to **Admin > Employees** and click an employee.
2. On the **Profile** tab, find **Adjust PTO Balance**.
3. Enter a positive number to add hours or a negative number to deduct them.
4. Enter a reason (required). This is recorded in the audit log.

---

## Logging PTO or Sick Days for Someone

Employees can log their own, but if they forget or you need to do it for them:

- **PTO:** Go to the employee's profile and use the PTO tab.
- **Sick / Call-Off:** Same, under the Sick tab.

---

## Exporting Data

Go to **Admin > Export**.

1. Choose the data type (Timesheets, PTO, Sick Days, or Call-Offs).
2. Set the date range.
3. Optionally filter by specific employees.
4. Click **Download CSV**.

To save a configuration you use often (like biweekly payroll), fill in the form and use **Save as Preset**. Presets appear at the top of the export page for one-click use.

---

## Setting Company Holidays

Go to **Admin > Holidays** and add holidays with a name, date, and whether they're paid. Holidays show up on the employee dashboard as a notice on that day.

---

## Posting Announcements

Go to **Admin > Announcements**. Fill in a title and body. Optionally set an expiry date.

The announcement shows as a banner at the top of every employee's dashboard until they dismiss it (or until it expires).

---

## Deactivating an Employee

1. Go to **Admin > Employees** and click the employee.
2. On the **Actions** tab, click **Deactivate**.

The account is soft-deleted. They cannot log in. Their history stays intact for reporting. You can reactivate them at any time.

---

## Forcing Someone to Sign Out

On the employee's **Actions** tab, click **Force logout**. This immediately invalidates all their sessions across all devices.

---

## Viewing the Audit Log

Go to **Admin > Audit Log**. All sensitive actions are recorded here. You can filter by action name or person. The log is read-only.

---

## Configuring App Settings

Go to **Admin > Settings** to configure:

- Whether breaks are paid or unpaid by default
- PTO rollover policy at year end (reset, carry over all, or carry over up to a cap)
- Pay period type (weekly or biweekly)
- Overtime warning and threshold hours
