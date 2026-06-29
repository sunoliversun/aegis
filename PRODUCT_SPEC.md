# Aegis — Personal & Household Cybersecurity Platform

> "Your family's security operations center. No expertise required."

---

## 1. Product Vision

Aegis is a unified personal cybersecurity platform that closes the gap between enterprise-grade protection and what individuals currently have access to. It operates at the **household level** — covering every person, device, account, and credential under one roof — and delivers proactive monitoring, automated remediation, human expert response, and financial insurance in a single $20–$30/month subscription.

The competitive moat is **completeness**: no single existing product does all of this. LifeLock does identity. Optery does data removal. Bitdefender does devices. Chubb does insurance. Aegis bundles all of it and adds the one thing none of them have: **a proactive human response layer for individuals**.

---

## 2. Target Users

| Segment | Description | Willingness to Pay |
|---|---|---|
| **Primary** | Adults 30–55, homeowners, family with children, moderate-to-high digital footprint | $20–$35/mo |
| **Secondary** | High-net-worth individuals, executives, public figures | $50–$100/mo (premium tier) |
| **Tertiary** | Young adults (18–29) with high online activity | $10–$15/mo (lite tier) |

---

## 3. Core Pillars

### Pillar 1 — Identity & Dark Web Monitoring
Continuous surveillance of your personal identifiers across breach databases, dark web forums, paste sites, and financial account systems.

**What it monitors:**
- Email addresses (all household members)
- Social Security Numbers
- Passport / driver's license numbers
- Credit card and bank account numbers
- Phone numbers
- Usernames and passwords in breach dumps
- Physical address history

**Data sources:**
- HaveIBeenPwned API (email breach lookup)
- SpyCloud API (credential breach intelligence)
- Experian / TransUnion / Equifax credit bureau APIs (3-bureau credit monitoring)
- Financial institution integrations (Plaid) for account monitoring
- Custom dark web crawlers / third-party dark web intelligence feeds (e.g., Constella Intelligence, Flare.io)

### Pillar 2 — Automated Data Broker Removal
Continuous, automated opt-out submissions to data broker and people-search sites, preventing your personal information from being publicly traded.

**Coverage targets:**
- 500+ data broker sites at launch (parity with Optery Extended)
- 1,000+ sites within 12 months
- Re-submission every 30 days (data re-aggregates)

**Execution approach:**
- Headless browser automation (Playwright) for sites without formal opt-out APIs
- Direct API integrations where available
- Human-assisted removals for sites requiring notarized requests
- Removal status dashboard (pending / confirmed / re-appeared)

### Pillar 3 — Household Device & Network Security
Passive and active security monitoring across the home network and all connected devices.

**Coverage:**
- Home router vulnerability scanning
- IoT device inventory (identify unknown devices on network)
- Device OS/firmware outdated-version alerts
- Open port scanning
- DNS-level malicious domain blocking (home network)
- Mobile device health checks (iOS/Android via companion app)

**Technical approach:**
- Lightweight local agent (Windows/macOS) for endpoint visibility
- Network probe: either (a) router plugin/firmware (ASUS/Netgear API) or (b) small hardware device (Raspberry Pi-class, like Firewalla model)
- Cloud-side analysis of telemetry

### Pillar 4 — Proactive Monitoring & Alerts (Personal SOC)
This is the key differentiator. Instead of sending you an alert and leaving you to figure it out, Aegis triage alerts and provides:

- **Severity scoring** (Low / Medium / High / Critical) with plain-English explanation
- **Guided remediation steps** (what to do, in order, with links)
- **One-click actions** where automatable (e.g., initiate fraud freeze, submit removal request)
- **Escalation to a human expert** for High/Critical incidents

**Human response layer (for High/Critical alerts):**
- On-call security analysts (contracted, 24/7 coverage via tiered SLA)
- Analyst reviews the incident, contacts relevant institutions on your behalf
- Works like a "personal IR retainer" — the equivalent of an enterprise MDR service
- Delivered via in-app chat + phone callback

### Pillar 5 — Personal Cyber Insurance
Financial backstop completing the risk transfer loop.

**Coverage:**
- Identity theft losses: up to $1M (premium tier) / $250K (standard tier)
- Unauthorized financial transactions: up to $50K
- Ransomware / extortion demands: up to $25K
- Cyberbullying / online harassment response costs
- Legal fees for identity restoration

**Delivery model:**
- White-label partnership with an admitted insurance carrier (e.g., Munich Re / HSB, Chubb, Coalition)
- Policy embedded in the Aegis subscription — no separate insurance application
- Claims initiated directly from the Aegis dashboard

---

## 4. Pricing Architecture

| Tier | Price | Who It's For | Key Inclusions |
|---|---|---|---|
| **Lite** | $10/mo | Singles, low footprint | 1 person, email/SSN monitoring, 100 broker removals, basic device alerts |
| **Standard** | $20/mo | Individuals | 1 person, full ID monitoring, 500+ broker removals, device/network, $250K insurance |
| **Household** | $30/mo | Families (up to 5 members) | All Standard features × 5 members, shared network dashboard, $1M insurance, human response |
| **Premium** | $75/mo | Executives / HNW | All Household + concierge analyst, enhanced dark web intel, executive threat profile |

---

## 5. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│  Next.js Web App (App Router)  │  iOS App  │  Android App           │
│  - Household Dashboard         │  - Alerts │  - Alerts              │
│  - Threat Feed                 │  - Agent  │  - Agent               │
│  - Insurance Portal            │           │                        │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS / WSS
┌──────────────────────────────▼──────────────────────────────────────┐
│                         API GATEWAY (Next.js API Routes / tRPC)      │
│  Auth (NextAuth.js + JWT)  │  Rate Limiting  │  Request Validation   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
┌─────────▼──────┐  ┌─────────▼──────┐  ┌─────────▼──────┐
│  Core API      │  │  Monitor       │  │  Response      │
│  Service       │  │  Service       │  │  Service       │
│  (TypeScript)  │  │  (TypeScript)  │  │  (TypeScript)  │
│                │  │                │  │                │
│ - Household    │  │ - Breach scans │  │ - Alert triage │
│   management  │  │ - Broker scans │  │ - Severity calc│
│ - User auth    │  │ - Device scans │  │ - Remediation  │
│ - Subscription │  │ - Credit pulls │  │ - Human escal. │
│ - Insurance    │  │ - Dark web     │  │ - Comms send   │
└─────────┬──────┘  └─────────┬──────┘  └─────────┬──────┘
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                          DATA LAYER                                  │
│  PostgreSQL (primary)  │  Redis (cache + queues)  │  S3 (files)     │
│  - Users / Households  │  - Session store         │  - Reports      │
│  - Monitored assets    │  - BullMQ job queues     │  - Evidence     │
│  - Alert history       │  - Real-time pub/sub     │  - Audit logs   │
│  - Insurance policies  │                           │                 │
└─────────────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────────────┐
│                      INTEGRATION LAYER                               │
│                                                                     │
│  Identity / Breach          Device / Network       Insurance        │
│  ─────────────────          ────────────────       ─────────        │
│  HaveIBeenPwned API         Local agent (Win/Mac)  HSB/Munich Re    │
│  SpyCloud API               Network probe          Chubb API        │
│  Constella Intelligence     Shodan API             Coalition API    │
│  Experian / TU / EFX        VirusTotal             (white-label)    │
│  Plaid (bank monitoring)    CVE/NVD feeds                           │
│                                                                     │
│  Data Broker Removal        Notifications          Payments         │
│  ─────────────────          ─────────────          ────────         │
│  Playwright automation      Twilio (SMS)           Stripe           │
│  EasyOptOuts API            SendGrid (email)       (subscriptions)  │
│  BrokerBase API             FCM/APNs (push)                         │
│  Human removal queue        PagerDuty (analyst)                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. Data Model (Core Entities)

```typescript
// Household — the primary unit of protection
Household {
  id: uuid
  name: string
  plan: 'lite' | 'standard' | 'household' | 'premium'
  stripeSubscriptionId: string
  insurancePolicyId: string
  createdAt: timestamp
}

// Member — individual within a household
HouseholdMember {
  id: uuid
  householdId: uuid (FK)
  userId: uuid (FK)
  role: 'owner' | 'adult' | 'child'
  firstName: string
  lastName: string
}

// MonitoredAsset — anything we watch on behalf of a member
MonitoredAsset {
  id: uuid
  memberId: uuid (FK)
  type: 'email' | 'ssn' | 'phone' | 'credit_card' | 'bank_account' 
       | 'passport' | 'address' | 'username' | 'domain'
  value: string (encrypted at rest — AES-256)
  valueHash: string (for dedup lookups — SHA-256)
  addedAt: timestamp
  lastScannedAt: timestamp
}

// Device — household device inventory
Device {
  id: uuid
  householdId: uuid (FK)
  type: 'laptop' | 'desktop' | 'phone' | 'tablet' | 'router' | 'iot'
  name: string
  macAddress: string
  ipAddress: string
  os: string
  osVersion: string
  agentInstalled: boolean
  lastSeenAt: timestamp
  riskScore: number (0-100)
}

// Alert — a detected threat or risk event
Alert {
  id: uuid
  householdId: uuid (FK)
  memberId: uuid (FK, nullable)
  deviceId: uuid (FK, nullable)
  category: 'breach' | 'dark_web' | 'broker_exposure' | 'credit' 
            | 'device_vuln' | 'network' | 'financial'
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  rawData: jsonb
  status: 'new' | 'acknowledged' | 'in_remediation' | 'resolved' | 'escalated'
  humanEscalatedAt: timestamp (nullable)
  resolvedAt: timestamp (nullable)
  createdAt: timestamp
}

// RemediationStep — plain-English steps attached to an alert
RemediationStep {
  id: uuid
  alertId: uuid (FK)
  order: number
  title: string
  description: string
  actionType: 'manual' | 'automated' | 'link'
  actionUrl: string (nullable)
  completedAt: timestamp (nullable)
}

// BrokerRemoval — data broker opt-out tracking
BrokerRemoval {
  id: uuid
  memberId: uuid (FK)
  brokerName: string
  brokerUrl: string
  status: 'pending' | 'submitted' | 'confirmed' | 'reappeared' | 'failed'
  submittedAt: timestamp (nullable)
  confirmedAt: timestamp (nullable)
  nextCheckAt: timestamp
}

// InsuranceClaim — claims initiated from the dashboard
InsuranceClaim {
  id: uuid
  householdId: uuid (FK)
  alertId: uuid (FK, nullable)
  type: 'identity_theft' | 'financial_fraud' | 'ransomware' | 'harassment'
  amountClaimed: number
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'denied' | 'paid'
  carrierClaimId: string (nullable)
  createdAt: timestamp
}
```

---

## 7. Monitoring Job Architecture (Background Workers)

All monitoring runs on scheduled BullMQ jobs in Redis:

```
Job Schedules:
─────────────────────────────────────────────────────
breach-scan          Every 4 hours   (HaveIBeenPwned + SpyCloud)
dark-web-scan        Every 6 hours   (Constella / Flare)
credit-pull          Weekly          (Experian/TU/EFX — soft pull)
broker-scan          Daily           (check re-appearance)
broker-removal       Daily           (submit pending opt-outs)
device-scan          Every 2 hours   (agent heartbeat + vuln check)
network-scan         Every 30 min    (router/IoT probe)
alert-triage         On new alert    (severity scoring + remediation gen)
escalation-check     Every 5 min     (check if high/critical unacknowledged > 30 min)
```

---

## 8. Security Risk Score (The "Household Score")

Every household gets a single 0–100 score on their dashboard, updated in real time. This is the product's primary UX anchor — the thing that makes complex security legible to non-technical users.

**Score components:**
| Component | Weight | How Calculated |
|---|---|---|
| Active unresolved alerts | 35% | Severity-weighted count |
| Credential exposure | 20% | Breached assets / total monitored assets |
| Broker exposure | 15% | Profiles found / sites monitored |
| Device health | 15% | Vulnerable devices / total devices |
| Credit health | 10% | Fraud flags, new hard inquiries |
| Insurance coverage | 5% | Coverage active = full 5% |

Score bands:
- **85–100**: Protected (green)
- **65–84**: Some risks (yellow)
- **40–64**: Needs attention (orange)
- **0–39**: At risk (red)

---

## 9. Key User Flows

### Onboarding (10-minute setup)
1. Create account → select household plan → Stripe checkout
2. Add household members (name + email)
3. Add monitored assets (email, phone, SSN — guided wizard)
4. Install device agent (optional, Windows/macOS)
5. Connect home network (optional — scan via agent or local probe)
6. Insurance policy auto-issued (embedded via carrier API)
7. First scan runs → initial score + first alert set displayed

### Alert Response Flow
```
New alert detected
       │
       ▼
Severity scored (low / medium / high / critical)
       │
       ├── Low/Medium → Push notification + in-app
       │                Guided remediation steps
       │                User self-serves
       │
       └── High/Critical → Push + SMS immediately
                           In-app shows remediation steps
                           30-min timer starts
                           │
                           If not acknowledged in 30 min:
                           → Analyst assigned (PagerDuty)
                           → Analyst reviews + contacts user
                           → Analyst takes action on behalf of user
```

### Insurance Claim Flow
1. Alert triggers claim eligibility banner
2. User clicks "File Claim" → pre-filled with alert evidence
3. Aegis submits to carrier API with supporting documentation
4. Status tracked in dashboard (real-time carrier status sync)
5. Approved funds paid direct to user bank account

---

## 10. Frontend Architecture (Next.js App Router)

```
app/
├── (auth)/
│   ├── login/
│   └── signup/
├── (dashboard)/
│   ├── layout.tsx          ← Household context, global nav
│   ├── page.tsx            ← Home: Score + alert feed
│   ├── members/
│   │   ├── page.tsx        ← Member list + add member
│   │   └── [id]/page.tsx   ← Per-member risk view
│   ├── alerts/
│   │   ├── page.tsx        ← All alerts, filterable
│   │   └── [id]/page.tsx   ← Alert detail + remediation steps
│   ├── identity/
│   │   └── page.tsx        ← Monitored assets, breach history
│   ├── brokers/
│   │   └── page.tsx        ← Broker removal status table
│   ├── devices/
│   │   └── page.tsx        ← Device inventory + health
│   ├── network/
│   │   └── page.tsx        ← Home network map + IoT inventory
│   ├── insurance/
│   │   ├── page.tsx        ← Policy details + coverage summary
│   │   └── claims/page.tsx ← Claims history + new claim
│   └── settings/
│       └── page.tsx        ← Notifications, billing, household mgmt
├── api/
│   ├── auth/[...nextauth]/
│   ├── trpc/[trpc]/        ← tRPC router
│   └── webhooks/
│       ├── stripe/
│       └── carrier/        ← Insurance status callbacks
└── components/
    ├── HouseholdScore/     ← The big score gauge
    ├── AlertFeed/          ← Real-time alert list
    ├── MemberCard/
    ├── DeviceMap/          ← Network visualization
    └── RemediationWizard/
```

---

## 11. Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 15 (App Router) | SSR + streaming, strong ecosystem |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, accessible |
| API | tRPC (type-safe end-to-end) | Eliminates API contract bugs |
| Auth | NextAuth.js v5 | OAuth + credentials, session mgmt |
| Database | PostgreSQL (via Supabase or Neon) | Relational, ACID, encryption support |
| ORM | Prisma | Type-safe DB access, migrations |
| Cache / Queues | Redis (Upstash) + BullMQ | Job scheduling, pub/sub |
| Real-time | Pusher or Supabase Realtime | WebSocket alerts |
| File storage | AWS S3 | Reports, audit evidence |
| Payments | Stripe (Subscriptions) | Industry standard, hooks |
| Email | SendGrid | Transactional email |
| SMS | Twilio | Critical alert SMS |
| Push | Firebase Cloud Messaging | Mobile push |
| Monitoring | Sentry + Datadog | Error tracking + observability |
| Deployment | Vercel (Next.js) + Railway/Render (workers) | Scalable, zero-config |
| Secrets | Doppler or AWS Secrets Manager | Credential management |

---

## 12. Third-Party API Integration Plan

### Phase 1 (Launch — Month 1–3)
| Integration | Purpose | API | Cost Model |
|---|---|---|---|
| HaveIBeenPwned | Email breach lookup | REST | $3.50/mo (unlimited) |
| Experian CreditLock API | Credit monitoring | REST | Revenue share / licensing |
| Optery / EasyOptOuts | Data broker removal (white-label) | REST | Per-member/mo |
| Plaid | Bank account monitoring | REST | Per-connected-account |
| Stripe | Payments + subscriptions | REST | 2.9% + $0.30 |
| SpyCloud | Breach credential intel | REST | Enterprise contract |

### Phase 2 (Scale — Month 4–9)
| Integration | Purpose |
|---|---|
| Constella Intelligence | Deep dark web monitoring |
| Flare.io | Dark web + paste site crawling |
| TransUnion + Equifax | Full 3-bureau credit |
| Shodan | IoT device vulnerability data |
| VirusTotal | File/URL threat lookup |
| Munich Re / HSB | Insurance carrier (white-label policy) |

### Phase 3 (Differentiation — Month 10–18)
| Integration | Purpose |
|---|---|
| Twilio Intelligence | Voice phishing detection |
| Google Safe Browsing API | Real-time URL checking |
| Router vendor APIs | ASUS/Netgear/TP-Link for network data |
| PagerDuty | Human analyst on-call routing |

---

## 13. Security & Compliance Requirements

**Data encryption:**
- All PII encrypted at rest (AES-256) — SSNs, credit card numbers, passport numbers stored as encrypted blobs
- All values used for dedup stored as SHA-256 hashes separately
- TLS 1.3 minimum in transit
- Database encryption at rest (Postgres encrypted volume)

**Access control:**
- Zero internal access to decrypted SSNs / financial data (only the monitoring jobs access raw values via service accounts)
- Audit log for every internal data access
- Role-based access: owner / adult member / read-only

**Compliance targets:**
- SOC 2 Type II (required before enterprise/premium launch)
- CCPA / CPRA (California — data deletion requests)
- GLBA (Gramm-Leach-Bliley — financial data handling)
- State-level insurance regulations (working through licensed carrier partner)

---

## 14. Build Roadmap

### Phase 0 — Foundation (Weeks 1–4)
- [ ] Next.js project scaffold + Tailwind + shadcn/ui
- [ ] Auth (NextAuth.js) + Household + Member data model
- [ ] Stripe subscription integration (all 4 tiers)
- [ ] Onboarding wizard (add members, add monitored assets)
- [ ] HaveIBeenPwned integration (first monitoring job)
- [ ] Dashboard shell (score gauge placeholder, alert feed)
- [ ] SendGrid transactional email (welcome, alert notifications)

### Phase 1 — Core Monitoring (Weeks 5–10)
- [ ] SpyCloud dark web credential monitoring
- [ ] Experian credit monitoring integration
- [ ] Alert model + severity scoring engine
- [ ] Remediation step generation (templated per alert type)
- [ ] Real-time alert push (Pusher / Supabase Realtime)
- [ ] Household score calculation (first version)
- [ ] SMS alerts for High/Critical (Twilio)

### Phase 2 — Broker Removal (Weeks 11–16)
- [ ] EasyOptOuts or Optery white-label API integration
- [ ] Broker removal status dashboard
- [ ] Automated re-submission scheduler (BullMQ)
- [ ] Manual removal queue (for sites requiring notarized requests)

### Phase 3 — Device & Network (Weeks 17–24)
- [ ] Windows/macOS lightweight agent (Electron or native)
- [ ] Network scanner (Shodan API + local probe)
- [ ] Device inventory + vulnerability detection
- [ ] IoT device risk scoring
- [ ] Network map visualization (dashboard)

### Phase 4 — Insurance & Human Response (Weeks 25–32)
- [ ] Insurance carrier API integration (white-label policy)
- [ ] Policy issuance at checkout (embedded in subscription)
- [ ] Claims dashboard + carrier status sync
- [ ] Human escalation routing (PagerDuty)
- [ ] Analyst interface (internal tool for on-call analysts)

### Phase 5 — Mobile & Scale (Weeks 33–40)
- [ ] React Native mobile app (iOS + Android)
- [ ] Push notifications via FCM/APNs
- [ ] Mobile device health agent
- [ ] Premium tier: executive threat profile

---

## 15. Key Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Credit bureau API access denied / expensive | High | High | Start with Experian (most accessible), build around it; use Plaid as fallback for bank monitoring |
| Insurance carrier partnership slow to close | Medium | High | Launch without insurance in Phase 1; add in Phase 4; position as "coming soon" |
| Data broker removal at scale is fragile | High | Medium | White-label Optery/EasyOptOuts initially rather than building own automation |
| SSN / PII data breach at Aegis | Low | Critical | Encrypt at rest, minimize raw PII access, third-party pen test before launch, cyber insurance on own infrastructure |
| Customer acquisition cost too high | Medium | High | B2B2C distribution (sell through homeowners insurance, banks, telecom) alongside direct |
| Human analyst scaling cost | Medium | Medium | AI-first triage; human escalation only for true High/Critical; outsource to MSSP partners |

---

## 16. Differentiation Summary

| Feature | LifeLock | Aura | Optery | Firewalla | Aegis |
|---|---|---|---|---|---|
| Identity monitoring | ✅ | ✅ | ❌ | ❌ | ✅ |
| Dark web monitoring | ✅ | ✅ | ❌ | ❌ | ✅ |
| Data broker removal | ❌ | Partial | ✅ | ❌ | ✅ |
| Device security | ❌ | Basic | ❌ | ✅ | ✅ |
| Network / IoT | ❌ | ❌ | ❌ | ✅ | ✅ |
| Household-level | Basic | Basic | ❌ | Basic | ✅ |
| Human response | Call center | ❌ | ❌ | ❌ | ✅ (MDR-style) |
| Cyber insurance | Basic | ❌ | ❌ | ❌ | ✅ (embedded) |
| Proactive (not reactive) | ❌ | ❌ | ❌ | Partial | ✅ |
| Single unified score | ❌ | ❌ | ❌ | ❌ | ✅ |

---

*Document version: 1.0 — June 2026*
*Stack: Next.js 15 + TypeScript + PostgreSQL + Redis + tRPC*
