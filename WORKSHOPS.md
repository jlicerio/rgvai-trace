# Trace — Workshop Curriculum

> **5-Phase Educational Program for Learning LLMs, Tool Calling, and MCP**
>
> Designed for the RGV AI Coalition. Each phase builds on the previous,
> moving from "what is an API call?" to "build a self-modifying agent."

---

## Phase 1: Prompt Engineer
**Badge:** 🏅 Prompt Engineer
**Difficulty:** Beginner
**Time:** 45–60 min

### Learning Objectives
- Understand the request/response cycle of an LLM API
- Identify the components of a chat completion: system prompt, user message, assistant response
- Build your first pipeline in Trace using Provider → Chat → Observer
- Read a curl command and map it to the HTTP request it represents

### Key Concepts

| Concept | Definition |
|---------|-----------|
| **Provider** | The LLM endpoint configuration (URL, model, API key). In Trace, think of this as "who is powering your agent." |
| **Chat node** | Holds the conversation: system prompt, user messages, and model response. This is "what you ask." |
| **Observer node** | A passive listener that captures the full request/response cycle. "What actually happened on the wire." |
| **Curl** | A command-line tool for making HTTP requests. Every pipeline step generates one — this is the raw truth of what your browser/agent did. |
| **Completion** | The model's text response to your prompt. |

### Step-by-Step

1. **Open Trace** at the workshop URL
2. **Register** with a username + password (no email needed)
3. **From the sidebar**, drag a **Provider** node onto the canvas
   - Set endpoint to `sandbox` (built-in mock, no API key needed)
   - Set model to `mock-gpt-4o`
4. **Drag a Chat node** — connect it below the Provider
   - Write a system prompt: *"You are a helpful workshop assistant."*
   - Add a user message: *"What is an API?"*
5. **Drag an Observer node** — connect it below the Chat node
6. **Click Play ▶** to run the pipeline
7. **Look at the Curl tab** — this is the exact HTTP request that would be sent to an LLM provider
8. **Look at the Observer tab** — see the request body and simulated response

### Exercise: Modify and Re-run
Change the system prompt and user message. Hit Play again. Notice how the curl changes — the body payload reflects your new messages.

### Discussion Questions
- What part of the curl represents your API key?
- What happens if you remove the Provider node? Why?
- How is a curl command like a "receipt" for your API call?

---

## Phase 2: Web Miner
**Badge:** 🏅 Web Miner
**Difficulty:** Intermediate
**Time:** 45–60 min

### Learning Objectives
- Understand how external data sources feed into an LLM's context
- Add a Search node to a pipeline and connect it to a Chat node
- See how search results become part of the prompt
- Compare a Chat-only pipeline with a Search-Augmented pipeline

### Key Concepts

| Concept | Definition |
|---------|-----------|
| **Search node** | Performs a web search and returns results as structured text |
| **Context injection** | How external data (search results, documents) is inserted into the LLM's prompt |
| **Retrieval-Augmented Generation (RAG)** | The pattern of fetching relevant information before generating a response |
| **Tool node** | A node that performs an action (search, browse, compute) rather than just passing data through |

### Step-by-Step

1. **Start from Phase 1's pipeline** — Provider → Chat → Observer
2. **Add a Search node** between the Provider and Chat nodes
   - Enter a search query: *"What is the capital of Mars?"*
3. **Wire the nodes**: Provider → Search → Chat → Observer
4. **Update the Chat node's system prompt**: *"Answer the user query based on the search context provided."*
5. **Click Play ▶**
6. **Observe the flow**:
   - Search node fires first, fetches results
   - Chat node receives the results as part of its input context
   - Chat node generates a response based on those results

### Exercise: Compare Results
Run the pipeline with and without the Search node connected. Notice how the answer changes — without Search, the LLM relies on its training data; with Search, it has fresh information.

### Discussion Questions
- Why does adding search make the answer more accurate?
- What happens if the search returns no results?
- How could you use this pattern to answer questions about current events?

---

## Phase 3: Tool Builder
**Badge:** 🏅 Tool Builder
**Difficulty:** Intermediate
**Time:** 60–75 min

### Learning Objectives
- Understand the Model Context Protocol (MCP) and how tools are discovered
- Connect an MCP node to discover tools from a server
- Wire the MCP tool definitions into a Chat node's tool-calling loop
- See the LLM decide to call a tool and use its result

### Key Concepts

| Concept | Definition |
|---------|-----------|
| **MCP** | Model Context Protocol — a standard way for LLMs to discover and call external tools |
| **Tool discovery** | The process of asking an MCP server "what tools do you have?" and getting back a list of tool definitions with schemas |
| **Tool calling** | When the LLM decides a tool can help answer the question, it returns a `tool_calls` request instead of a text response |
| **Tool-calling loop** | The cycle: LLM requests a tool call → system executes the tool → result goes back to the LLM → LLM continues with the result |
| **Schema** | A JSON description of what arguments a tool accepts (name, type, required/optional) |

### Step-by-Step

1. **Set up Provider → Chat → Observer** as before
2. **Add an MCP node** and connect it to the Chat node (wire Chat → MCP → Observer in parallel, or MCP as upstream of Chat)
3. **In the MCP node**, enter a server URL:
   - Sandbox: use the built-in tool registry (leave default)
   - Or point to a real MCP server: `http://localhost:9000/mcp`
4. **Click "Discover Tools"** — the node lists available tools with their names, descriptions, and input schemas
5. **Select a tool** from the dropdown
6. **In the Chat node**, add a user prompt that would benefit from a tool call:
   - *"Get me the current system status"*
   - *"Search for recent AI news"*
7. **Click Play ▶**
8. **Observe the tool-calling loop**:
   - Chat sends the prompt with tool definitions included
   - LLM responds with `tool_calls` — the name of the tool and its arguments
   - Executor calls the MCP tool with those arguments
   - Tool result goes back to the LLM
   - LLM generates a final text response incorporating the tool result

### Exercise: Multi-Tool Workflow
Connect multiple MCP nodes to the same Chat node. The LLM sees all available tools and can choose which one to call based on the user's request.

### Discussion Questions
- Why does the LLM need tool definitions (schema) to call a tool?
- What happens if the tool returns an error?
- How does tool calling differ from just pasting search results into a prompt?

---

## Phase 4: Flow Orchestrator
**Badge:** 🏅 Flow Orchestrator
**Difficulty:** Advanced
**Time:** 60–75 min

### Learning Objectives
- Combine multiple tool types in a single pipeline (Search + Browser + MCP)
- Build a data-processing pipeline where one node's output feeds the next
- Use the Stepper to debug execution step-by-step
- Export a pipeline as Python, JavaScript, or curl

### Key Concepts

| Concept | Definition |
|---------|-----------|
| **Pipeline** | A directed graph of nodes where data flows from providers through tools to observers |
| **Topological sort** | The algorithm that determines which node executes first based on connections |
| **Stepper** | A debug mode that pauses execution at each node so you can inspect inputs/outputs |
| **Code export** | Translating your visual pipeline into executable code in Python, JS, or shell |
| **Data dependency** | A node can only run after all its upstream (input) nodes have completed |

### Step-by-Step

1. **Build a complex pipeline**: Provider → Search → Chat → Browser → Chat → Observer
2. **Configure the first Chat** to generate a search query from a topic
3. **Wire Search results into a Browser node** that fetches a page
4. **Feed that page content into a second Chat node** for summarization
5. **Enable Stepper mode** — click the Step Thru button
6. **Run the pipeline** — it pauses at each node
7. **Inspect intermediate results** — see raw search results before they enter the Browser, raw HTML before the summarizer
8. **Export your pipeline** using the Code Exporter:
   - Python: `pip install httpx && python trace_pipeline.py`
   - JavaScript: `node trace_pipeline.js`
   - curl: paste the sequence of commands

### Exercise: Debug a Broken Pipeline
Intentionally miswire two nodes (e.g., connect Observer → Provider creating a cycle). Run the pipeline — Trace detects the cycle and shows an error. Fix the wiring and rerun.

### Discussion Questions
- What makes a good pipeline topology? (wide vs. deep)
- When would you use parallel branches vs. sequential chains?
- How does the exported code relate to the visual nodes?

---

## Phase 5: Agentic Architect
**Badge:** 🏅 Self-Modifier
**Difficulty:** Advanced
**Time:** 75–90 min

### Learning Objectives
- Understand self-modifying tool registries
- Build a pipeline where the LLM creates new tool definitions at runtime
- Explore the Registry node for tool storage and versioning
- Combine all previous skills into an agent that extends its own capabilities

### Key Concepts

| Concept | Definition |
|---------|-----------|
| **Registry** | A self-modifying database of tool definitions that the agent can read from and write to |
| **Self-modification** | When an agent generates, validates, and registers new tools during execution |
| **Meta-cognition** | The agent thinking about its own capabilities — "What tools do I have? What tools do I need?" |
| **Guardrails** | Schema validation that prevents registering dangerous or malformed tools |
| **Agent loop** | The full cycle: perceive → think → act → observe → update self |

### Step-by-Step

1. **Set up Provider → Registry → Chat → Observer**
2. **Configure the Registry** with some starter tools (search, calculator, file_read)
3. **In the Chat node**, prompt the LLM to create a new tool:
   - *"You need a tool that converts temperatures between Celsius and Fahrenheit. Create it and register it."*
4. **Run the pipeline** — the LLM generates the tool code and the Registry stores it
5. **Verify** — open the Registry to see the new tool listed
6. **Add second Chat node** that calls the newly created tool
7. **Run again** — the pipeline now uses the tool the LLM just created

### Exercise: Build a Tool Chain
1. Phase 1: Create a data-fetching tool (scrapes a URL)
2. Phase 2: Create a data-processing tool (extracts keywords)
3. Phase 3: Connect both in a pipeline where the agent decides when to use each
4. The agent discovers, installs, and uses its own tools autonomously

### Discussion Questions
- What are the safety implications of self-modifying agents?
- How would you prevent a self-modifying agent from creating dangerous tools?
- What's the difference between an agent that uses tools vs. an agent that builds tools?
- How does this architecture relate to AutoGPT, Claude Agents, or ChatGPT Plugins?

---

## Instructor Notes

### Setup Requirements
- **No install needed** for students — works in any browser at `https://linuxbox.tailfceaca.ts.net/trace/`
- **Sandbox mode** works without API keys for all phases
- For Phases 3–5 with live LLMs, students can bring their own API key or use a shared classroom key

### Timing
| Phase | Time | Pace |
|-------|------|------|
| 1: Prompt Engineer | 45–60 min | Self-paced with guided demo |
| 2: Web Miner | 45–60 min | Pair programming recommended |
| 3: Tool Builder | 60–75 min | Instructor-led MCP deep dive |
| 4: Flow Orchestrator | 60–75 min | Project-based (build your own pipeline) |
| 5: Agentic Architect | 75–90 min | Capstone project |

### Troubleshooting

**"My pipeline doesn't run"**
- Check all edges are connected (look for gaps between handles)
- Every pipeline needs exactly one Provider node
- Observer nodes don't need to be connected to run, but won't show data

**"Search returned no results"**
- DuckDuckGo blocks automated queries sometimes — try a different query
- Check the Observer to see the raw HTTP response

**"MCP tool discovery failed"**
- Verify the server URL is correct
- The MCP server must support the `tools/list` endpoint
- Check CORS settings if connecting to a remote server

**"What if the LLM doesn't call my tool?"**
- Make the prompt explicitly ask for the tool: "Use the [tool name] tool to..."
- Add a system instruction: "You have access to the following tools..."

### Extensions for Advanced Students
- **Custom MCP server**: Build an MCP server in Python using FastMCP
- **Visual export**: Generate a React component from a pipeline
- **Parallel execution**: Modify the executor to run independent branches concurrently
- **Authentication**: Add OAuth support for MCP servers
