# Agent Ecosystem Architecture Overview

This document permanently logs the design decisions, pipeline logic, database schema, and active integrations that power this personalized AI workforce platform.

## Tech Stack
- **Framework**: Next.js 14 App Router
- **Database**: PostgreSQL (with the `pgvector` extension for embeddings)
- **ORM**: Prisma Client
- **Agent Orchestrator**: LangGraph and LangChain.js
- **UI**: React.js, Tailwind CSS, Lucide Icons

---

## 1. Core Database Architecture & Entity Connections

The database operates under a strict **multi-tenant** isolation model. Everything cascades down from the `Tenant` entity.

### Primary Entities
- **`Tenant`**: The root account owner. 
  - *Connections*: One-to-Many with `Agent`, `Document`, `Message`, `Simulation`, and `ApiKey`.
  - *Key Params*: `companyDescription` (serves as the operational domain boundary for the AI classifiers).
- **`Agent`**: The worker nodes.
  - *Connections*: Belongs to `Tenant`. One-to-Many with `AgentChannel`.
  - *Key Params*: `provider` (OpenAI, Gemini, Ollama), `model`, `config` (JSON map storing authorization rules like `allowedDocuments`), `systemPrompt`.
- **`AgentChannel`**: Channel-specific persona overrides for a given Agent.
  - *Key Params*: `channel` (e.g., EMAIL, WHATSAPP, WEB), `systemPrompt`.
- **`Document` & `DocumentChunk`**: Stores the uploaded files. 
  - *Connections*: `Document` belongs to `Tenant`. `DocumentChunk` belongs to `Document` via Cascade Delete.
  - *Key Params*: Chunks contain text embeddings within the `Unsupported("vector")` pgvector type.
- **`Message`**: Every interaction from a human or AI.
  - *Connections*: Belongs to `Tenant`, optional self-relation to `parentMessageId` representing threads.
  - *Key Params*: `sender`, `threadId`, `content`, conversational `trace` (JSON representation of AgentState), intent `category`, and critically business operations: `bookingStatus` (`BOOKED` or `NONE`).
- **`ApiKey`**: Secure access tokens.
  - *Key Params*: `key` (hashed unique string), `lastUsed`.

---

## 2. The LangGraph Orchestrator Pipeline (`src/lib/agents/orchestrator.ts`)

The AI ecosystem relies on a stateful graph powered by LangGraph to process logic conditionally. This drastically reduces LLM token costs and latency by bypassing unnecessary tasks.

### The `AgentState` Interface (`src/types/agent.ts`)
As the conversation traverses the graph, the nodes share and mutate this strict global state object:
- `messages: BaseMessage[]` - The memory history and current query, alongside internal `[Researcher]` or `[Orchestrator]` thought traces.
- `tenantId: string` - Identifies the workspace.
- `agentId?: string` - The specific agent responding.
- `next?: string` - The routing instruction variable defining the next graph node.
- `category?: string` - The classified intent (e.g., BUSINESS, GREETING, SPAM).
- `context?: string[]` - Document text retrieved via RAG by the Researcher.
- `channel?: string` - The origin platform of the message (WEB, EMAIL).
- `bookingStatus?: string` - Flags if the agent successfully closed a transaction.

### Node 1: The Classifier (`orchestratorNode`)
Before an agent fires, an LLM classifier categorizes the user's message using the `Tenant.companyDescription` to enforce strict boundaries.
- **GREETING**: Simple conversational opening. -> *Updates State*: `next: "respond"`
- **BUSINESS**: A domain-relevant inquiry. -> *Updates State*: `next: "research"`
- **AUTOMATED/OTHER/SPAM**: Alerts or out-of-bounds chatter violating the company description limit. -> *Updates State*: `next: "__end__"` (Node execution terminates entirely, message dropped.)

### Node 2: The Researcher (`src/lib/agents/researcher.ts`)
If `next === "research"`, the state routes here to query the vector database for answers.
- **Requirement Extraction**: An LLM reads the thread history + new message to extract a dense, highly focused "search query", stripping conversational fluff.
- **Security Isolation**: It extracts `Agent.config.allowedDocuments`. It forcefully applies an SQL constraint (`d."id" IN (...)`) natively against pgvector, physically isolating the query.
- *Updates State*: Appends Vector findings to `context` array, sets `next: "respond"`.

### Node 3: The Responder/Clerk (`src/lib/agents/clerk.ts`)
If `next === "respond"`, the system generates the final human-readable reply.
- **Content Generation**: Uses the assembled `context` strings and the `Agent.systemPrompt` to answer.
- **Booking Detection**: A secondary internal check reads the AI's final output to verify if it actively sealed a deal on that turn. 
- *Updates State*: Returns `bookingStatus: "BOOKED" | "NONE"`. Automatically transitions to `__end__` once complete.

### Graph Connections (Routing Edges)
- `__start__` → `orchestrate`
- `orchestrate` → `research` (If BUSINESS)
- `orchestrate` → `respond` (If GREETING)
- `orchestrate` → `__end__` (If DROP)
- `research` → `respond`
- `respond` → `__end__`

---

## 3. Integrations & Exposing the Agents

### A. External Chat API (`src/app/api/external/chat/route.ts`)
Allows custom SaaS products or external websites to chat with specific agents headlessly.
- **Authentication**: Requires `Authorization: Bearer <TOKEN>` cross-checked against the `ApiKey` table.
- **Parameters**: Accepts `{ "agentId": "x", "message": "Hi", "channel": "CHAT" }`. 
- **Execution Flow**: Invokes the orchestrator, runs the entire pipeline securely passing along the API Key's hidden `tenantId`, saves the resulting trace to the `Message` table, and returns `{ "reply": "...", "bookingStatus": "NONE" }`.

### B. Internal Application Dashboard (`src/app/api/dashboard/stats/route.ts`)
Feeds live analytics directly to `src/app/dashboard/page.tsx` via PostgreSQL aggregations:
- **Conversion Rate**: Dynamically calculates `(Messages where bookingStatus = "BOOKED") / Total AI Messages`.
- **Activity Stream**: Pulls a chronological scroll of classifier activities direct from recent `Message.category` and `Message.trace` items, mapping logic outputs like "Bypassed research for simple greeting".
