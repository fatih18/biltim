# Vorion Meeting Analyzer – LLM Feature Ideas

## 1. During the Meeting (Real-time)

### 1.1 Live Meeting Copilot
- **Purpose**
  - Continuous summary of what has been discussed so far.
  - Highlight which agenda items are covered / missing.
- **LLM Calls**
  - `MEETING_LIVE_SUMMARY` – Given latest transcript window, produce 3–5 bullet points.
  - `MEETING_AGENDA_COVERAGE` – Compare transcript vs. agenda; return done / pending topics.
- **UI**
  - Right-side panel with sections:
    - `So far` – bullets
    - `Still missing` – agenda items not discussed yet.

### 1.2 Real-time Action Item Extractor
- **Purpose**
  - Capture tasks as soon as they are mentioned.
- **LLM Calls**
  - `EXTRACT_ACTION_ITEMS_LIVE` on transcript chunks.
- **Output Shape**
  - `[{ owner, action, due_date, priority, source_snippet }]`
- **UI**
  - “Action items” strip that grows during the meeting.

### 1.3 Speaking Balance & Meeting Health
- **Purpose**
  - Show who is dominating, who is silent.
- **Signals**
  - Speaker-wise talk time %, interruption patterns, sentiment per speaker.
- **LLM + Stats**
  - Stats from raw transcript (speaker labels).
  - `MEETING_HEALTH_ANALYSIS` – interpret stats into insights.

### 1.4 Real-time Q&A over Ongoing Meeting
- **Purpose**
  - Allow attendees to ask: “What was decided about pricing?” during the call.
- **LLM Calls**
  - `MEETING_QA` – RAG over current meeting transcript buffer.
- **UI**
  - Small chat input on the Analyzer page, bound to `meeting:<id>:llmcalls`.

### 1.5 Live Risk & Blocker Detector
- **Purpose**
  - Flag potential risks while the call is happening.
- **LLM Calls**
  - `EXTRACT_RISKS_LIVE` – Per chunk: risks, blockers, dependencies.
- **UI**
  - Small `Risks` badge in Analyzer with count + quick list.


## 2. After the Meeting (Post-processing)

### 2.1 Multi-layered Summaries
- **Purpose**
  - Serve different audiences with different detail levels.
- **Layers**
  - `Executive Summary` – 3–7 bullets.
  - `Detailed Minutes` – structured by agenda/topic.
  - `Decisions` – what, who, why, when.
  - `Action Items` – canonical list.
- **LLM Calls**
  - `MEETING_FULL_SUMMARY` – main call that returns structured JSON for all layers.

### 2.2 Follow-up Packages
- **Types**
  - **Participant email** – recap + next steps.
  - **Manager email** – high level report.
  - **Ticket drafts** – JIRA/Linear issue suggestions from action items.
- **LLM Calls**
  - `MEETING_EMAIL_SUMMARIES` – multiple email personas.
  - `MEETING_TICKET_DRAFTS` – generate backlog items from actions.

### 2.3 Risk & Dependency Report
- **Purpose**
  - Give PM/lead a focused view of what can go wrong.
- **LLM Calls**
  - `MEETING_RISK_REPORT` – cluster risks, add impact/probability suggestions.
- **Output**
  - `[{ title, description, impact, likelihood, owners, mitigation }]`.

### 2.4 Knowledge Base Enrichment
- **Purpose**
  - Turn meetings into reusable knowledge.
- **LLM Calls**
  - `MEETING_KB_CANDIDATES` – suggest KB entries (concepts, decisions, workflows).
- **Output**
  - `[{ title, summary, tags, suggested_space, source_meeting_id }]`.

### 2.5 Cross-meeting Intelligence
- **Purpose**
  - Connect multiple meetings together.
- **LLM Calls**
  - `MEETING_SERIES_SUMMARY` – summarise last N meetings for the same project/customer.
  - `MEETING_DECISION_HISTORY` – how a specific decision evolved over several calls.


## 3. Hidden Conversation Design: `meeting:<id>:llmcalls`

### 3.1 Message Types
- `system`: meeting meta – `{ meeting_id, project_id, participants, agenda }`.
- `user/tool`:
  - `TRANSCRIPT_CHUNK { start_ms, end_ms, text, speaker }`
  - `EVENT { type, payload }` (e.g. screen share start, recording stop).
- `assistant`:
  - `SUMMARY_SNAPSHOT`
  - `ACTIONS_EXTRACTED`
  - `DECISIONS_LOG`
  - `RISKS`
  - `KB_CANDIDATES`.

### 3.2 General Flow
1. Create hidden conv `meeting:<id>:llmcalls` when Analyzer starts.
2. Stream transcript chunks as `TRANSCRIPT_CHUNK` messages.
3. Periodically call specialised LLM tools using this conversation as context.
4. Store all intermediate outputs in the same conversation to have a full reasoning trace.


## 4. Extra Idea Starters

- **Role-based views**
  - Different projections for `Engineer`, `PM`, `Executive` from the same meeting.
- **Goal alignment check**
  - Given meeting goal + transcript, rate: `Did we achieve the goal? Why/why not?`.
- **Scope creep detector**
  - Detect when conversation goes far away from the original agenda.
- **Decision quality coach**
  - Analyze if key decisions are backed by data, alternatives, risks.
- **Next-meeting agenda generator**
  - From unresolved topics + risks + actions, propose agenda for the next call.


## 5. Product / GTM Driven Features (Not Necessarily LLM)

### 5.1 Deal / Account Timeline View
- **What**
  - Per opportunity / account, a timeline of all meetings, recordings, decisions and action items.
- **Why it sells**
  - Sales leaders and CSM’ler için "tek bakışta" müşteri geçmişi; özellikle churn / upsell case’lerinde çok güçlü.
- **Implementation notes**
  - Basit metadata (account_id, opportunity_id, stage) + mevcut meeting kayıtlarıyla başlayabilir.

### 5.2 Customer-facing Portal / Share Links
- **What**
  - Her meeting için müşteriye gönderilebilen özet + action items sayfası (read-only link).
- **Why it sells**
  - Ürünün değeri müşterinin de gözünün önüne geliyor; satın alma komitesindeki diğer kişilere viral yayılım.
- **Implementation notes**
  - Önce basit passwordless magic-link / signed token ile shareable page.

### 5.3 Team Analytics & Coaching Dashboard
- **What**
  - Takım / kişi bazlı metrikler: toplantı sayısı, süre, no-show oranı, action item tamamlama oranı vb.
- **Why it sells**
  - Satış lideri, CS lead, CTO gibi alıcılara "ekip performansını ölçme" argümanı veriyor; bütçe justification çok kolay.
- **Implementation notes**
  - İlk versiyon saf istatistik; ileride LLM yorumları eklenebilir ama şart değil.

### 5.4 Playbook & Template Library
- **What**
  - Farklı meeting türleri için hazır şablonlar: Discovery, Demo, Onboarding, Incident Review, 1:1, Retrospective...
- **Why it sells**
  - Ürün sadece kayıt/transcript değil, "nasıl iyi toplantı yapılır" rehberi sunuyor. Özellikle yeni ekipler için çok değerli.
- **Implementation notes**
  - Sadece JSON / Markdown template’leri ve UI’de seçici ile başlayabilir.

### 5.5 Compliance & Privacy Controls
- **What**
  - Kolayca erişilebilir ayarlar: hangi toplantılar kaydedilebilir, retention süreleri, hangi kullanıcılar görebilir vb.
- **Why it sells**
  - Büyük şirketlerde güvenlik/compliance kritik. "Bizde data governance var" demek enterprise satışta game changer.
- **Implementation notes**
  - Basit role-based visibility + retention policy ile MVP yapılabilir.

### 5.6 CRM / Task Manager Integrations (Lightweight)
- **What**
  - Tek tıkla action item’ları Jira/Linear/Asana/ClickUp, notları ise HubSpot/Salesforce’a push etme.
- **Why it sells**
  - "Zaten günlük işimi orada yapıyorum" diyen kullanıcılara friction’ı azaltır; adoption ve renewal için kritik.
- **Implementation notes**
  - Önce sadece export (manuel buton) ile başlanabilir; full sync daha sonra.

### 5.7 Meeting Hygiene Guardrails
- **What**
  - Basit ama etkili: toplantı süresini, katılımcı sayısını, tekrar eden gündemsiz toplantıları işaretleyip raporlama.
- **Why it sells**
  - Özellikle yöneticilere "toplantı yükünü ölçüp azaltma" vaadi çok güçlü ROI argümanı.
- **Implementation notes**
  - Kayıtlı toplantı sayısı, süre, katılımcı sayısı gibi ham verilerle başlar; LLM şart değil.

### 5.8 Success Metrics & ROI Dashboard
- **What**
  - Örneğin: "Toplantıdan çıkan action item’ların %X’i tamamlandı", "Son 30 günde kaç decision alındı" gibi metrikler.
- **Why it sells**
  - Satın alma kararı için CFO / COO’ya direkt ROI gösterebilen bir ekran.
- **Implementation notes**
  - Mevcut action item/decision verilerini basit grafikleriyle görselleştirmek yeterli.
