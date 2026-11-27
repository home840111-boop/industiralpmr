# Feature Documentation

**Client:** Auvitronics Limited  
**Document Date:** 17 Oct, 2026  
**Feature:** IPMR Dashboard: SAP ERP Production Targets Module - Complete User Experience (UX/UI) & Operator Training Guide  

| Parameter | Project & Implementation Details |
| :--- | :--- |
| **Client** | **Auvitronics Limited** *(Exclusive Enterprise Feature)* |
| **Document Date** | **17 Oct, 2026** |
| **Feature** | **IPMR Dashboard: SAP ERP Production Targets Module - Complete User Experience (UX/UI) & Operator Training Guide** |
| **Feature Exclusivity** | **Designed, developed, and deployed ONLY for Auvitronics Limited** |
| **Scope** | **47 Production Machines** (Port Qasim Plant: 29 machines \| Hub Plant: 18 machines) |
| **Execution Window** | **Standard Office Working Hours (9:00 AM – 6:00 PM)** |
| **Factory Personnel Required** | **1 Electrical Technician** (panel safety & isolation) + **1 Production Technician** |

> [!NOTE]
> **Instructions for Google Docs / Word (.docx) Export**:  
> This document includes dedicated `[INSERT SCREENSHOT]` callout boxes with visual instructions, bounding recommendations, and caption templates. You can paste this entire markdown into Google Docs or Gemini to generate your document, then insert the respective screenshots at the marked positions.

---

## 1. Document Overview & Objective

### 1.1 Purpose
This guide provides a comprehensive, visual, and step-by-step walkthrough of the **SAP ERP Production Targets** feature inside the **iPMR Smart Factory Dashboard**. 

> [!IMPORTANT]
> **Client Exclusivity Notice**:  
> This feature is a **custom, proprietary capability developed and deployed EXCLUSIVELY for Auvitronics Limited**. It bridges Auvitronics' SAP ERP environment with its 47 monitored production machines across Port Qasim and Hub plants. It is cryptographically gated and completely inaccessible to any other factory or client on the iPMR platform.

### 1.2 Target Audience
* **Production Supervisors & Shift Leads**: Setting targets, linking POs, syncing ERP updates, and signing off completed runs.
* **Machine Operators**: Monitoring piece counters, identifying active part numbers, and tracking target progress.
* **Plant Operations & Continuous Improvement Teams**: Auditing variance between physical machine output and ERP confirmations.

### 1.3 Tenant Security & Data Isolation
The SAP ERP integration is gated at the software and Cloud Function proxy level by Auvitronics' designated Master User UID (`Q15Ie2n4GkY5uqbW1UJ9375vRF43`). All SAP credentials, RFC endpoints, cached production orders, and piece counts are isolated exclusively to Auvitronics Limited.

---

## 2. Quick Feature Summary: What Has Changed?

| Conventional Target Workflow | New iPMR × SAP Integrated Workflow |
| :--- | :--- |
| Manual typing of Part Number and Description from paper sheets. | **1-Click Autocomplete**: Pulls official SAP PO description & part number instantly. |
| Target piece count manually entered and editable by anyone on the floor. | **Locked Governance**: Target quantity locks to SAP's authorized planned quota (`PSMNG`). |
| Target due date manually estimated or guessed. | **Auto Due Date**: Automatically syncs with the PO's official scheduled End Date (`GLTRP`). |
| Multi-cavity family molds required separate manual setups. | **Family Mold Switcher**: Multi-material POs are recognized automatically with interactive part buttons. |
| Targets auto-archived immediately when quota reached, stopping data accumulation. | **Floor Continuity (Manual Completion)**: Floor sensors keep counting uninterrupted until supervisors manually sign off. |

---

## 3. UI Component Breakdown & Screen Layout

When you open the **Add Target** or **Update Target** window on any machine, the screen is organized into intuitive, logically grouped sections:

> 📷 **[INSERT SCREENSHOT 1 HERE]**  
> *Recommended Image*: Full view of the Add/Update Target modal with a linked SAP PO.  
> *Caption*: **Figure 1: Overview of the Add/Update Target Modal with linked SAP Production Order, family mold switcher, locked quota, and auto-populated due date.**

```
+-----------------------------------------------------------------------------------------------+
| Add / Update Target Modal                                                                 [X] |
+-----------------------------------------------------------------------------------------------+
|  [SAP ERP BAR]                                                                                |
|  Import from SAP Production Order [LINKED]                Last synced: Today, 11:30 AM [Sync]  |
|  [Query Range: 01 Oct 2026 - 31 Oct 2026 v]                                                   |
+-----------------------------------------------------------------------------------------------+
|  [ACTIVE LINKED PO CARD]                                                                      |
|  (Report Icon) PO #110100011769  [Z101]  [2 PARTS (FAMILY MOLD)]  [Due: 31 Oct 2026]          |
|                                                     [Change PO]  [Unlink SAP]                 |
|                                                                                               |
|  +-- SELECTED RUNNING PART ----------------------------------------------------------------+  |
|  |  BOARD, COWL SIDE TRIM, RH (62111V0D330)                                  [ACTIVE RUN] |  |
|  |  Part No: 000000004000000093 | SAP Target: 3,000 pcs | SAP Confirmed: 2,400 pcs         |  |
|  +-----------------------------------------------------------------------------------------+  |
|                                                                                               |
|  +-- SELECT PART TO RUN (FAMILY MOLD) -----------------------------------------------------+  |
|  |  (o) Part 1: BOARD, COWL SIDE TRIM, RH (62111V0D330)   [SELECTED]  Target: 3K  Conf: 2.4K |  |
|  |  ( ) Part 2: BOARD, COWL SIDE TRIM, LH (62111V0D340)               Target: 3K  Conf: 2.1K |  |
|  +-----------------------------------------------------------------------------------------+  |
|                                                                                               |
|  Manual Completion: SAP targets will not auto-complete upon reaching piece count.             |
|  Floor production continues to accumulate until manually completed.                           |
+-----------------------------------------------------------------------------------------------+
|  Name *                                           Mold *                                      |
|  [ 110100011769 - BOARD, COWL SIDE TRIM, RH    ]  [ UNSET (115s)                            v]|
+-----------------------------------------------------------------------------------------------+
|  Target pc(s) *                  Locked to SAP    Hourly Target pc(s)                         |
|  [ 3000                                        ]  [ 31                                      ] |
+-----------------------------------------------------------------------------------------------+
|  Monitor Downtime *                               Due Date                             [ ]Auto|
|  [ No                                         v]  [ 31/10/2026 12:00 am                     ] |
|                                                   SAP Due Date: 31 Oct 2026                   |
+-----------------------------------------------------------------------------------------------+
|  [Cancel]                                                                        [Add Target] |
+-----------------------------------------------------------------------------------------------+
```

---

## 4. Step-by-Step Operational Workflows

### Workflow A: Linking an SAP Production Order to a Machine (Add Target)

1. **Open the Target Window**:
   * Navigate to the target machine on the iPMR Dashboard.
   * Click the **Set Target** (or **Queue Target**) button.

2. **Specify the Query Date Window (Optional)**:
   * By default, iPMR queries active orders for the current calendar month.
   * To pull orders from another period, click **Query Range** to reveal quick presets:
     * `This Month`: Active month orders.
     * `Last Month`: Previous month records.
     * `Last 30 Days` / `Next 30 Days`: Rolling operational windows.
     * Or enter custom **Start Date** and **End Date** and click **Fetch Range**.

   > 📷 **[INSERT SCREENSHOT 2 HERE]**  
   > *Recommended Image*: Close-up crop of the expanded Query Range drawer showing the preset chips (`This Month`, `Last 30 Days`, etc.) and the date input fields.  
   > *Caption*: **Figure 2: Expanded SAP Query Date Range bar with preset buttons and custom date inputs.**

3. **Select the SAP Production Order**:
   * Click the **Select or search SAP Production Order...** dropdown.
   * Type any part of the **PO Number** (e.g., `110100011769`) or **Part Name** (e.g., `COWL SIDE`).
   * Click the matching order in the list.

   > 📷 **[INSERT SCREENSHOT 3 HERE]**  
   > *Recommended Image*: Dropdown menu opened showing filtered search results with PO numbers, part descriptions, and target piece counts.  
   > *Caption*: **Figure 3: Instant search & autocomplete dropdown for SAP Production Orders.**

4. **Verify the Auto-Populated Target Details**:
   * **Target Name**: Automatically populated as `PO# - Material Description`.
   * **Target Quantity**: Populated with the planned SAP piece count (`PSMNG`). Notice the blue **Locked to SAP** indicator—this protects against accidental on-floor alterations.
   * **Due Date**: Automatically set to the PO's scheduled finish date (`GLTRP`). A blue helper reads `SAP Due Date: [DD MMM YYYY]`.
   * **Hourly Target**: Automatically pre-calculated based on mold cycle time and cavity count.

5. **Commit the Target**:
   * Click **Add Target** (or **Update Target**).
   * The machine will immediately bind to the SAP order, and the floor sensor counter begins tracking.

---

### Workflow B: Managing Multi-Material Family Molds

Many injection molds run multi-cavity "family" setups that produce two or more distinct parts simultaneously (e.g., Left-Hand and Right-Hand components).

1. **Spotting a Family Mold**:
   * When you select a multi-material PO, a purple badge appears in the header:  
     `[2 PARTS (FAMILY MOLD)]` (or 3, 4, etc.).
   * A blue dashed container titled **Select Part to Run** displays each discrete part.

2. **Selecting the Active Part to Run**:
   * Each part card displays its:
     * Part Number (`MATNR`)
     * Description (`MAKTX`)
     * Individual SAP Target Quantity
     * Confirmed Yield in SAP
   * Simply **click on the part card** (or select its radio button) to set it as the active run.
   * The **Target Name**, **Target Quantity**, and **Selected Running Part** banner will instantly re-lock to that specific part’s specifications.

   > 📷 **[INSERT SCREENSHOT 4 HERE]**  
   > *Recommended Image*: Crop of the Family Mold switcher showing Part 1 (RH) and Part 2 (LH) with the radio buttons and individual target/confirmed quantities.  
   > *Caption*: **Figure 4: Family Mold Multi-Material Part Switcher with discrete part quotas.**

3. **Switching Active Parts Mid-Run**:
   * If a mold changeover occurs or the operator switches focus to the complementary part, open **Update Target**, select the other part card, and click **Update Target**.
   * Historical production counts remain preserved.

---

### Workflow C: Live Shop-Floor Monitoring (Dual-Counter Visibility)

Once a target with an SAP PO is running, the Machine Detail view presents the **SAP Target Summary Card**:

> 📷 **[INSERT SCREENSHOT 5 HERE]**  
> *Recommended Image*: The SAP Target Summary card on the machine page, showing the 4 metric cards: SAP Target, SAP Confirmed, Live iPMR Count, and Variance.  
> *Caption*: **Figure 5: Live machine monitor showing dual-track visibility between ERP confirmed tallies and real-time sensor cycles.**

```
+-----------------------------------------------------------------------------------------------+
| [SAP ORDER]  [MANUAL END REQUIRED]  PO #110100011769  [BOARD, COWL SIDE TRIM, RH]              |
| Last synced: Today, 11:45 AM                                                     [Sync SAP]   |
+-----------------------------------------------------------------------------------------------+
|  SAP TARGET              SAP CONFIRMED           LIVE iPMR COUNT          VARIANCE            |
|  3,000                   2,400                   2,520                    +120 pcs            |
|  PSMNG (Planned)         LMNGA (ERP Yield)       Sensor Cycle Pulses      (iPMR vs SAP)       |
+-----------------------------------------------------------------------------------------------+
```

#### What Each Number Means:
1. **SAP Target (Planned Quota)**: The total quantity contracted in the ERP system.
2. **SAP Confirmed (ERP Confirmed Yield)**: What the SAP system officially believes has been produced (from previous shift manual confirmations or batch uploads).
3. **Live iPMR Count (Physical Hardware Sensor)**: The exact, real-time piece count sensed by the physical optical/inductive hardware sensor on the machine.
4. **Variance**: The real-time difference between the machine sensor count and the SAP confirmed count. A positive variance indicates parts produced on the floor that have not yet been posted to SAP.
5. **Sync SAP Button**: Click anytime to pull fresh confirmation tallies from the SAP gateway. (A 10-second anti-spam protection prevents accidental rapid double-clicks).

---

### Workflow D: Target Quota Reached & The Manual Completion Safety Rule

> [!IMPORTANT]
> **The Golden Rule of SAP Targets**:  
> **SAP targets will NEVER automatically stop, shut off, or archive upon reaching 100% of the target piece count.**

#### Why?
In manufacturing operations, reaching the exact target piece count does not mean machine motors should abruptly halt or that the target should vanish from the screen:
* Floor operators frequently produce an authorized 1–3% overrun for quality quarantine buffers.
* Tooling remains installed until the shift handover or mold change crew arrives.

#### Operational Behavior:
1. When **Live iPMR Count >= SAP Target**:
   * A clear, green **`TARGET REACHED`** banner appears on the machine view.
   * **The hardware sensor continues to count and accumulate every single cycle.** No production data is lost.
2. **Officially Ending the Target**:
   * When the machine physically stops producing parts, the Supervisor opens the target and clicks **End Target**.
   * A prompt confirms the final piece count and archives the target run to the historical shifts database.

> 📷 **[INSERT SCREENSHOT 6 HERE]**  
> *Recommended Image*: The green Target Reached banner with the 'End Target' button on the machine screen.  
> *Caption*: **Figure 6: Target Reached alert banner with supervisor Manual End sign-off action.**

---

### Workflow E: Changing or Unlinking a PO

If an incorrect PO was selected or if production needs to revert to a standalone (non-SAP) manual target:

1. **Change PO**:
   * Click the **Change PO** button at the top right of the SAP card.
   * The card resets to the searchable PO selector dropdown, allowing you to select a different order.
2. **Unlink SAP**:
   * Click the red **Unlink SAP** button.
   * The target is immediately disconnected from SAP ERP.
   * The **Target Quantity** field unlocks, allowing manual numeric entry, and the target operates as a standard standalone iPMR target.

---

## 5. UI Elements & Status Indicators Reference

| UI Element | Location | Meaning / Action |
| :--- | :--- | :--- |
| **`Locked to SAP`** | Next to Target pc(s) input | Indicates the target piece count is governed by SAP ERP planned quantity and cannot be manually overridden. |
| **`SAP Due Date: [Date]`** | Under Due Date input | Displays the official SAP Basic Finish Date (`GLTRP`) synced from the PO schedule. |
| **`[N] PARTS (FAMILY MOLD)`** | Header of PO Card | Indicates that the order contains multiple discrete parts sharing the same production order. |
| **`ACTIVE RUN`** | Selected Running Part card | Confirms which part within a family mold is currently being manufactured and counted. |
| **`MANUAL END REQUIRED`** | Machine Overview header | Informs operators that this target will continue running past 100% until explicitly stopped by a supervisor. |
| **`Sync SAP`** | Header and Overview | Refreshes the local cache by querying the SAP Fiori Gateway for the latest confirmed quantities. |
| **`Query Range`** | Dropdown header | Expands presets (*This Month*, *Last 30 Days*, etc.) to retrieve POs outside the current calendar month. |

---

## 6. Frequently Asked Questions (Supervisor FAQ)

#### Q1: Why is the Target Quantity input grayed out?
> **Answer**: When linked to an SAP PO, the target quantity is locked to match SAP's planned order quota (`PSMNG`). This ensures data integrity between the ERP system and the factory floor. If you must run a custom manual target, click **Unlink SAP**.

#### Q2: What happens if an operator produces 3,050 pieces on a 3,000-piece target?
> **Answer**: The system records all 3,050 pieces. The target will display a `TARGET REACHED` status, but the counter will keep incrementing accurately until the supervisor clicks **End Target**.

#### Q3: How do I find a PO that was scheduled for next month?
> **Answer**: Click the **Query Range** button in the SAP section. Select **Next 30 Days** (or enter the specific custom start and end dates) and click **Fetch Range**. The selector will refresh with orders matching that timeframe.

#### Q4: Why doesn't the PO dropdown show due dates in the list?
> **Answer**: Per operational standards, the dropdown list is kept clean and legible showing `PO # [Number] - [Part Name] [Target: [Count]]`. The PO's official Due Date appears clearly in the order header and under the Due Date input field once selected.

#### Q5: Can two machines run the same SAP PO?
> **Answer**: Yes. If a high-volume PO is split across multiple machines, each machine can link to the same PO number. Each machine will independently track its own sensor counts while displaying the total SAP planned quota.

---

*Document compiled and published for iPMR Smart Manufacturing Operations.*  
*For technical support or ERP gateway inquiries, contact the Industrial Automation Systems Administrator.*
