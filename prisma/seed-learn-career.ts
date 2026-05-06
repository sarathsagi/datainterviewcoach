/**
 * seed-learn-career.ts
 *
 * Creates a "Resume, Portfolio & Salary Negotiation" learning path under
 * ContentCategory.ESSENTIAL_SKILLS. The non-technical half of getting hired
 * as a Data Engineer — what recruiters scan for in 6 seconds, which projects
 * actually move the needle, and how to negotiate the offer once it lands.
 */

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const PATH_SLUG = "resume-portfolio-negotiation";

const MODULES: Array<{
  slug: string;
  title: string;
  description: string;
  readTimeMinutes: number;
  content: string;
}> = [
  {
    slug: "data-engineering-resume-that-gets-interviews",
    title: "The Data Engineering Resume That Gets Interviews",
    description:
      "What recruiters and hiring managers actually look for in 6 seconds, the bullet-point formula that wins, the DE keywords that survive ATS, and 5+ before/after rewrites.",
    readTimeMinutes: 16,
    content: `# The Data Engineering Resume That Gets Interviews

Your resume is not your autobiography. It is a 6-second sales document optimized for two readers: a recruiter who has 200 other tabs open, and an ATS keyword scanner that has never had a thought in its life. Most DE candidates write resumes for a third, imaginary reader — a senior engineer who will lovingly read every word. That reader does not exist.

This module is opinionated on purpose. You will disagree with some of it. Do it anyway and watch your callback rate triple.

## The 6-second scan — what actually happens

A recruiter at a FAANG-tier company sees ~400 resumes per req. They are not reading. They are scanning, in this order:

1. **Company names** (top-right of each role). Brand recognition first.
2. **Job titles**. "Data Engineer" > "Software Engineer" > "Analyst" for a DE req.
3. **Most recent role's first bullet**. If it's weak, they're done.
4. **Tech stack keywords**. Spark, Airflow, Snowflake, dbt, Kafka, AWS.
5. **Education / years of experience** as a final sanity check.

Everything else — your "Summary," your hobbies, your 2014 internship — is decoration. If those five things don't sell you in six seconds, the resume is closed.

## The bullet-point formula

Every bullet on a DE resume should follow this shape:

> **Action verb + Tech used + Scale + Business impact**

Miss any of those four and the bullet is weak. Hit all four and you're in the top 5% of resumes.

| Slot | Examples |
|---|---|
| Action verb | Built, designed, migrated, optimized, reduced, automated, productionized, owned, led |
| Tech | Spark, Airflow, Snowflake, dbt, Kafka, Flink, Iceberg, BigQuery, Redshift, Terraform |
| Scale | TB/PB/day, billions of rows, N pipelines, M users, $X cost, p99 latency |
| Impact | $ saved, hours reclaimed, latency reduced, SLA hit, team unblocked |

Weak bullets miss scale and impact. Strong bullets quantify both.

## Five real DE bullet rewrites — weak to strong

### Rewrite 1: the "responsible for" trap

**Weak:**
> Responsible for building data pipelines using Spark and Airflow.

This bullet says nothing. "Responsible for" means you might have watched someone else do it. There is no scale, no impact, no specific problem.

**Strong:**
> Built 40+ Spark jobs orchestrated in Airflow processing 12 TB/day of clickstream events into Snowflake, cutting analytics latency from 24 h to 45 min and unblocking the marketing attribution team.

Annotations:
- "Built" — owned action verb, not "responsible for."
- "40+ Spark jobs" — concrete count signals real production scope.
- "12 TB/day" — scale is specific and credible (not "big data").
- "24 h to 45 min" — quantified impact.
- "Marketing attribution team" — named the human who benefited. Recruiters love this.

### Rewrite 2: the buzzword soup

**Weak:**
> Worked on big data pipelines leveraging cutting-edge cloud technologies and ML.

This is what a resume looks like when ChatGPT wrote it without context. Every word is empty.

**Strong:**
> Migrated 180 legacy Hive ETL jobs to dbt + Snowflake on AWS, reducing monthly compute spend from $42K to $11K and dropping average runtime from 4.2 h to 38 min.

Annotations:
- Real technologies (Hive, dbt, Snowflake, AWS), not "cloud technologies."
- Real number of jobs (180) signals migration was at production scale.
- Two impact numbers — cost (74% reduction) and runtime (85% faster).
- No "leveraged," no "synergized," no "cutting-edge." Use plain verbs.

### Rewrite 3: the orchestration nothing-burger

**Weak:**
> Used Airflow to schedule jobs and monitor pipelines.

Airflow scheduling is table stakes for DE. This bullet says you turned the computer on.

**Strong:**
> Designed Airflow DAG patterns (dynamic task mapping, sensor-based dependencies, custom KubernetesPodOperator) for 250+ DAGs serving 3 product teams; reduced average pipeline failure recovery time from 90 min to 8 min via a self-healing retry framework.

Annotations:
- Specific Airflow features (dynamic task mapping, sensors, KubernetesPodOperator) prove depth.
- Scale (250+ DAGs, 3 teams) frames scope.
- "Self-healing retry framework" is a phrase a hiring manager will circle and ask about.
- 90 min → 8 min is a juicy number for a screen.

### Rewrite 4: the streaming hand-wave

**Weak:**
> Built real-time data streaming systems using Kafka.

Every DE candidate writes this bullet. Hiring managers have learned to ignore it.

**Strong:**
> Built a Kafka + Flink pipeline ingesting 280K events/sec from 14 microservices, with exactly-once semantics via Flink checkpoints + Iceberg ACID writes; replaced a 90-minute hourly batch with a 15-second rolling window and saved $7K/mo in S3 list costs.

Annotations:
- 280K events/sec at 14 sources gives a credible mental picture of the system.
- "Exactly-once semantics via checkpoints + Iceberg" is the technical depth flag.
- "Replaced 90-min batch with 15-sec window" anchors the business value.
- "$7K/mo in S3 list costs" is the kind of niche detail only someone who actually ran the system would know — it screams authenticity.

### Rewrite 5: the data quality afterthought

**Weak:**
> Implemented data quality checks across pipelines.

Implemented how? At what scale? Catching what?

**Strong:**
> Authored a Great Expectations + dbt-test framework covering 600+ checks across 80 critical tables; cut Sev-2 data incidents by 62% YoY and reduced mean-time-to-detect bad data from 11 h to 25 min.

Annotations:
- Specific tools (Great Expectations + dbt-test).
- 600+ checks / 80 tables tells me you didn't just write three null checks.
- Sev-2 incidents and MTTD are the metrics on-call DE teams actually track.
- "62% YoY" is a recruiter-friendly stat.

### Bonus rewrite 6: the "team player" platitude

**Weak:**
> Collaborated with cross-functional teams to deliver insights.

Cut this bullet entirely. If you must keep it, make it earn its line.

**Strong:**
> Partnered with Finance and Product to design a single source-of-truth revenue model in dbt (12 staging models, 4 marts, snapshot strategy for SCD-2), eliminating 5 conflicting "monthly revenue" definitions across the company.

Annotations:
- Names the actual partners (Finance, Product). "Cross-functional" tells me nothing.
- Specifies dbt structure (staging, marts, SCD-2) — proves you did the modeling work, not just sat in meetings.
- The impact ("5 conflicting definitions") is a *political* win, which is how senior DEs are evaluated.

## DE-specific keywords that actually matter

Recruiters use Boolean searches and ATS systems use keyword density. If your resume doesn't contain the right tokens, a human never sees it. The keyword list for DE in 2026 is reasonably stable:

| Category | Keywords (use the ones that are true for you) |
|---|---|
| Languages | Python, SQL, Scala, Java, Bash |
| Batch processing | Spark, PySpark, Spark SQL, Hive, MapReduce |
| Streaming | Kafka, Flink, Spark Structured Streaming, Kinesis, Pulsar |
| Orchestration | Airflow, Dagster, Prefect, dbt, Argo |
| Warehouses | Snowflake, BigQuery, Redshift, Databricks SQL |
| Lakehouse | Delta Lake, Iceberg, Hudi, Parquet, ORC |
| Cloud | AWS (S3, EMR, Glue, Athena, MSK), GCP (GCS, Dataproc, Pub/Sub), Azure (ADLS, Synapse) |
| Modeling | Kimball, dimensional modeling, SCD-2, star schema, data vault |
| Quality / governance | Great Expectations, dbt tests, Monte Carlo, data contracts, lineage |
| Infra | Docker, Kubernetes, Terraform, CI/CD, GitHub Actions |

**Rule:** if a keyword appears in the JD and it's true of you, it must appear in your resume verbatim. ATS systems do not understand synonyms. "AWS" and "Amazon Web Services" are different tokens.

## Common red flags hiring managers see

These are the things that get a resume thrown in the no pile fast:

1. **No metrics anywhere.** If every bullet is qualitative, you look junior even if you're senior.
2. **Tech stack listed at the top with no evidence in the bullets.** "Spark, Kafka, Flink, Airflow, dbt" at the top, but the bullets only mention Excel and Tableau? You're a fraud.
3. **Job-hopping without context.** Three roles in two years with no story. Even one-line context ("contract role," "company acquired and shut down") rescues this.
4. **The 4-page resume.** One page if you're <8 years experience, two pages max otherwise. No exceptions for DE.
5. **Buzzword density.** "Leveraged synergies to drive innovative solutions in the big data ecosystem." Recruiters can smell this from 5 lines away.
6. **Tools instead of outcomes.** "Used Spark, used Airflow, used Snowflake." Tools are means, outcomes are ends.
7. **Skills section that lists 47 technologies.** No one believes you're an expert in 47 things. Pick 12.
8. **Personal projects from 2018.** A 7-year-old Kaggle notebook is a negative signal at this point.
9. **GPA on the resume past your second job.** Cut it.
10. **A "Summary / Objective" section longer than 2 lines.** Cut the objective entirely. The summary, if it exists, is one line that names your specialization (e.g., "Senior Data Engineer specializing in petabyte-scale streaming pipelines on AWS").

## Projects vs jobs — when each carries weight

**If you have ≥3 years of full-time DE experience:** projects are noise. Cut the projects section entirely or shrink it to one line. Your jobs are the evidence.

**If you have 0–2 years of full-time DE experience or you're transitioning:** projects are 40% of your resume's surface area. Treat them like jobs — use the same Action+Tech+Scale+Impact formula, even if "scale" is "10 GB" and "impact" is "open-source repo with 80 stars."

A transitioning candidate's project bullet:

> Built an end-to-end COVID-19 case data pipeline (Airflow → Spark on EMR → Iceberg on S3 → Streamlit dashboard) ingesting 4 public APIs daily; published as open-source with 320 GitHub stars and a 2.4K-view Medium write-up.

This bullet does serious work for someone without DE experience.

## What to cut — ruthlessly

Cut these from every DE resume:
- "References available upon request." Implied. Always.
- Hobbies, unless they are *genuinely* unusual (competing in chess at master level, yes; "hiking and reading," no).
- Languages, unless relevant to the role (multilingual fintech roles excepted).
- Photos. Especially in the US — they introduce bias risk and recruiters will sometimes auto-reject.
- "Proficient in Microsoft Office." It's 2026.
- Coursework lists past your second job.
- Any technology you "exposure to" or "familiar with." Either you've shipped with it or you haven't.

## The format that works

- **One page** if <8 years experience, **two pages** otherwise. Use the second page only if needed.
- **Reverse chronological**, always. "Functional" resumes signal that you're hiding something.
- **Sans-serif font**, 10–11pt body, 12–14pt headers. Helvetica, Inter, or Calibri.
- **Black on white**. Color accents OK in moderation; full-color templates are not.
- **PDF only**. Never .docx — formatting breaks across systems.
- **Filename**: \`Firstname_Lastname_Resume.pdf\`. Not \`resume_v17_FINAL_v2.pdf\`.

## The structure (top to bottom)

1. **Name + contact** (2 lines max). Email, phone, LinkedIn, GitHub. No street address.
2. **Optional 1-line summary**, only if it adds signal beyond your most recent job title.
3. **Experience** — most recent role first. 4–6 bullets per role for current/most recent, 2–3 for older roles.
4. **Skills** — grouped (Languages, Batch, Streaming, Cloud, Orchestration). 10–14 items total. No proficiency bars (those are juvenile).
5. **Projects** — only if you're junior or transitioning, or if you have a *genuinely* notable side project (open-source maintainer, popular blog, etc.).
6. **Education** — degree, institution, year. One line each.
7. *Skip* certifications unless they are AWS Solutions Architect Pro / GCP Pro Data Engineer / Databricks Certified DE Pro. Lower-tier certs are noise.

## The "tailoring" principle

You should have **one master resume** with everything you've ever done, and a **per-application resume** that picks the most relevant 60–70%. The master resume can be 4 pages. Nobody sees it.

For each application:
1. Pull the JD's keywords and rank them.
2. Reorder your bullets so the most JD-relevant bullets are at the top of each role.
3. Cut bullets that aren't on-message for this role.
4. Add the JD's keywords to your Skills section if they're true.

Yes, this takes 20 minutes per application. It is also the difference between 2% callback rates and 25% callback rates.

## Anti-patterns specific to DE candidates

1. **Listing every Hadoop ecosystem tool.** "HDFS, YARN, Hive, Pig, Oozie, Sqoop, Flume, Zookeeper" — this dates you to 2016. Cut anything you wouldn't use today unless the role explicitly requires it.
2. **"Big data" as a noun.** It hasn't been a useful term since 2018. Be specific: "petabyte-scale," "billion-event-per-day."
3. **Confusing "data engineer" and "data analyst" bullets.** If your bullets are mostly Tableau dashboards and Excel pivots, you are positioning as an analyst, not an engineer. Hiring managers will move your resume to the analyst pile.
4. **Mentioning "ML pipelines" without specificity.** "Built ML pipelines" tells me nothing. "Built feature engineering pipelines (Spark + Feast) producing 1,200 features for 6 production models" tells me everything.
5. **"Implemented data lake."** Nobody implements a data lake. You implement specific things in a data lake — bronze/silver/gold layering, partition strategies, compaction jobs.

## A test you can run today

Print your resume. Hold it at arm's length for six seconds. Then put it down.

What do you remember?

If the answer is "their company logos and the words Spark and Snowflake" — congratulations, you wrote a 6-second resume.

If the answer is "I don't know, lots of words" — you wrote a 60-second resume that nobody will read for 60 seconds.

Rewrite until the answer is the first one.

## Practice exercise

Take your most recent role's first bullet. Apply this checklist:

- [ ] Starts with a strong action verb (not "responsible for," "worked on," "helped with")
- [ ] Names at least one specific technology
- [ ] Contains at least one number (scale)
- [ ] Contains at least one outcome (impact)
- [ ] Fits on two lines or fewer
- [ ] Would survive an ATS keyword scan for the role you're targeting
- [ ] Could be expanded into a 5-minute interview story if asked

If any box is unchecked, rewrite. If all are checked, do the same for every other bullet on the resume.

That's the whole game.
`,
  },
  {
    slug: "building-a-de-portfolio-that-impresses",
    title: "Building a DE Portfolio That Impresses",
    description:
      "What makes a project signal-worthy vs noise, the 3 archetypes that consistently land DE interviews, README structure, hosting choices, and how to talk about projects in interviews.",
    readTimeMinutes: 14,
    content: `# Building a DE Portfolio That Impresses

A side project on your resume is either a powerful signal or a small negative one. There is no middle ground. A trivial project — "I scraped Reddit and put it in Postgres" — actively hurts you because it suggests you think that level of work is interview-worthy.

This module is about how to build the kind of project that makes a hiring manager email the recruiter saying "fast-track this one."

## What makes a project signal-worthy

Three things separate a portfolio piece that lands interviews from one that gets ignored:

1. **Real data.** Not a 50 MB CSV from Kaggle. Real means: a public API with rate limits, a streaming source you have to handle, a warehouse table at a scale where naive code breaks.
2. **Real volume.** If your project doesn't cross at least one threshold where naive code stops working, it's a tutorial, not a project. Examples: "doesn't fit in pandas memory," "single-threaded takes >30 min," "naive partitioning causes shuffle OOM."
3. **Real problems.** Schema drift. Late-arriving data. A source that goes down. Costs that spiral if you're not careful. Idempotency. The project should show how you handled at least one *production-shaped* problem, not just the happy path.

A "tutorial-shaped" project — follow steps, ingest tidy data, write to one place, dashboard at the end — has zero signal. Hiring managers have seen 10,000 of these. They are positively allergic to them.

## What makes a project noise

| Anti-pattern | Why it hurts |
|---|---|
| Kaggle CSV → pandas → SQLite | No volume, no production shape, no DE problem solved |
| "I deployed Airflow with Docker Compose" | That's the *setup*, not the project |
| Hello-world Spark word count | Tutorial signal, zero engineering |
| Twitter sentiment dashboard | Done by 200K bootcamp grads. Generic. |
| Stock price predictor | This is an ML project, not a DE project |
| "I migrated my todo app to use Redis" | Toy scale, no DE skills demonstrated |

If your top GitHub project is on this list, take it down. A recruiter who clicks through and finds it is now actively skeptical of you.

## The 3 archetypes that consistently land interviews

After looking at hundreds of portfolios that worked, three project shapes show up repeatedly. Pick one of these. Don't reinvent.

### Archetype 1: The end-to-end production-shaped pipeline

You build an ingestion-to-serving pipeline that *would actually work* if a real business needed it. The hallmarks:

- **Real source**: a streaming API (Twitter v2 firehose-via-rules, Coinbase WebSocket, NOAA, GitHub events, Reddit Pushshift archives).
- **Real ingestion path**: source → Kafka or Kinesis or Pub/Sub → object storage (raw zone) → transformation (Spark / dbt / Flink) → curated zone → serving (warehouse, API, or dashboard).
- **Real orchestration**: Airflow, Dagster, or Prefect — with retries, alerting, and a backfill story.
- **Real quality**: at least one set of dbt tests or Great Expectations suites that run in CI.
- **Real observability**: a logs/metrics setup that lets you actually answer "did the 4am run succeed?"
- **Real cost awareness**: you wrote down what running this costs per month and what you'd change to cut it in half.

This archetype demonstrates breadth. The reader walks away thinking "this person could be productive on day 1."

### Archetype 2: The performance optimization story

Take an existing slow thing and make it 10–100x faster, with a clear write-up of what you did and why. Hallmarks:

- A baseline measurement (with code) that shows the slow version.
- A specific bottleneck identified (skew? IO? wide transformation? bad partitioning?).
- An iterative series of fixes, each with measured impact.
- A final state that quantifies the improvement.
- Honest discussion of what you tried that didn't work.

This archetype demonstrates depth. The reader walks away thinking "this person has actually debugged Spark before, not just used it."

Examples that work:
- "Took a 4-hour Spark join down to 7 minutes by switching from sort-merge to broadcast on the dim side and salting the fact table's hot keys."
- "Reduced a 1.2 TB Snowflake monthly bill to $180 by re-clustering and rewriting one dashboard query that was scanning 90% of the table."

### Archetype 3: The data quality / contracts framework

Build a small but real framework that solves a problem you've seen in production. Hallmarks:

- A clearly stated problem ("PMs change column names upstream and silently break our dashboards").
- A specific design (data contracts as YAML, enforced in CI, with a Slack alert on violation).
- A working implementation, even if narrow.
- Documentation explaining the trade-offs you considered and rejected.

This archetype demonstrates judgment. The reader walks away thinking "this person thinks like a senior."

Examples that work:
- A schema-registry-as-code repo with a CI workflow that blocks PRs introducing breaking schema changes.
- A "data freshness SLA" Airflow plugin that pages you when a downstream table hasn't been written in N hours.
- A reusable dbt macro pack for SCD-2 with comprehensive tests.

## Three worked example projects

These are project specs you could clone today. Each is intentionally narrow, intentionally production-shaped, and intentionally explainable in a 5-minute interview story.

### Worked project A — End-to-end NYC TLC trip pipeline (Archetype 1)

**Problem.** NYC's Taxi & Limousine Commission publishes monthly Parquet files of every trip. ~3 billion rows historical, ~10M new rows/month. Build a pipeline that ingests, cleans, and serves analytics-ready trip data with quality guarantees.

**Stack.** S3 (raw + curated zones, Iceberg tables) + Airflow (orchestration) + Spark on EMR Serverless (transforms) + dbt (modeling layer) + Great Expectations (quality) + Streamlit (one demo dashboard).

**The DE problems you'll hit and solve in the README:**
- Schema drift across years (pre-2015 columns differ from current).
- Bad data: trips with negative fares, zero distance, end-before-start timestamps.
- Late-arriving partitions (TLC sometimes republishes a month).
- Cost: naive Spark on the full historical = $$. Solve with partition pruning + Z-order on pickup_date.
- Backfill: how do you re-process 2014 without breaking 2024?

**What the README ends with.** A "what I'd do differently if this were production" section listing 4–5 things — that section is what hiring managers read most carefully.

### Worked project B — Spark join performance deep-dive (Archetype 2)

**Problem.** Take a public dataset (Stack Overflow data dump, ~50 GB, 5 tables) and build a query that joins all 5 tables to compute "top 10 users by accepted answer count, by tag, by year." Naive implementation. Measure. Then optimize.

**Stack.** Spark 3.5 on a 4-node cluster (or local with synthetic load). Iceberg or Delta as table format. Profile with Spark UI.

**The story you'll tell:**
1. Baseline: 47 minutes, 11 stages, one stage with 1 task taking 38 minutes (skew on the popular tag).
2. Diagnosis: Spark UI shows that one task processed 73% of the shuffle data. Tag distribution is power-law.
3. Fix 1: salt the tag column on the join probe side, broadcast the dimension side. Down to 14 minutes.
4. Fix 2: pre-aggregate per-user-per-tag-per-year before the final join. Down to 6 minutes.
5. Fix 3: Z-order + partition by year on the source table. Down to 2.4 minutes.
6. What didn't work: AQE alone didn't fix it (skew threshold was too generous), broadcast on the wrong side made it worse.

**What the README ends with.** A reproducible \`make benchmark\` target so a hiring manager can run your numbers themselves. This is the kind of detail that separates the top 1%.

### Worked project C — Lightweight data contracts in CI (Archetype 3)

**Problem.** A common production pain: upstream services rename columns or change types, and downstream pipelines silently break. Build a tiny but real framework where every "producing" team commits a YAML schema contract to a central repo, and any PR that breaks consumers fails CI.

**Stack.** Python + Pydantic + GitHub Actions + dbt's manifest.json (to discover consumers).

**Components:**
- A \`contracts/\` folder with one YAML file per produced table (columns, types, freshness SLA, owner).
- A CI script that diffs the contract against the previous commit and flags breaking changes (renamed/dropped columns, type changes that aren't widening).
- An optional reverse-lookup that uses dbt's manifest to identify all downstream models that would be affected.

**The story you'll tell.** "I was tired of being woken up by schema-change incidents. I built a tiny framework that pushes the cost of breakage onto producers, where it belongs. We rolled it out to one critical table set; over 6 months, schema-change incidents dropped from 9 to 1, and the 1 was caught in CI before it shipped."

If the project is real (you ran it on a real codebase, even your own), this is a Staff-level signal.

## How to write the README — the structure

Hiring managers read README files like resumes — fast, top-down, looking for signal. Use this structure exactly:

\`\`\`markdown
# Project Title

One-sentence description. What does it do, for whom?

## TL;DR

- The 3-bullet version of the project, optimized for a 30-second skim.
- Include the most impressive number ("processes X events/sec at Y cost").
- Include the most interesting technical challenge you solved.

## Architecture

[Diagram - draw.io, excalidraw, or even ASCII art]

A 2-paragraph walkthrough of the diagram.

## Why these choices

The opinionated section. "I picked Iceberg over Delta because X.
I used Airflow over Dagster because Y. I'd revisit Z if the system grew."

## What's hard about this

The "real problems" section. List 3-5 production-shaped issues you
hit and how you solved them.

## Running it locally

[5-line copy-pasteable bash that actually works]

## What I'd do differently

The honest retrospective. 3-5 things.

## What's next

If anyone reading this wants to contribute, here's what's open.
\`\`\`

The two sections most candidates skip — "Why these choices" and "What I'd do differently" — are the two most read by hiring managers. They are *the* signal of seniority.

## What to host on — GitHub vs blog vs both

| Audience | Best surface |
|---|---|
| Recruiters scanning your resume | GitHub link in resume header |
| Hiring managers technical-screening you | GitHub README + an architecture blog post |
| The broader DE community (and your future self) | Medium / personal blog |

You want **both** a clean GitHub repo *and* a write-up. The repo proves it's real. The write-up proves you can think and communicate.

**Link strategy on the resume:** put the GitHub URL in the contact line, and link the *specific repo* in the project's bullet on the resume. Don't make the reviewer dig.

**On GitHub:**
- Pin your top 3–6 repos to your profile.
- Make sure the project repo is public, has a clean commit history, and has a star (yes, star your own — it's a quality cue).
- Use a real \`README.md\` as the repo home; don't rely on the GitHub auto-rendering of code.
- Tag releases (\`v1.0.0\`) — signals you ship.

**On the blog:**
- Write one focused post per project — the architecture write-up.
- Embed the diagram. Embed code snippets sparingly; link to GitHub for full code.
- End with "questions / feedback" + your contact.

## How to talk about a project in an interview

You will be asked: "Tell me about a project you're proud of." This is not a small-talk question. It's a 15-minute structured probe.

The structure of a strong answer:

1. **Context (45 seconds).** What was the problem? Why did it matter? Who would benefit?
2. **Constraints (45 seconds).** What was hard about it? What were the trade-offs?
3. **Architecture (90 seconds).** Walk through the diagram in your head. Name the components and the flow.
4. **One specific deep dive (3–4 min).** Pick the most interesting technical challenge and tell that story end-to-end. Numbers, decisions, alternatives considered.
5. **Outcome (60 seconds).** What was the measurable result? What did you learn?
6. **Reflection (60 seconds).** What would you do differently?

That last bullet is what separates seniors from juniors. *Always* end with reflection, even if not asked.

## Anti-patterns when discussing projects

| Anti-pattern | Why it hurts |
|---|---|
| "It's a portfolio project, so it's not super realistic" | Apologizing for it tells the interviewer to discount it |
| Listing the tech stack first | Lead with the problem, not the tools |
| Glossing over the "why this choice" decisions | Decisions are the seniority signal, not the choices themselves |
| Claiming impact you can't quantify | "It was way faster" is weaker than "47 min → 6 min" |
| No retrospective | Senior engineers always have a retrospective |
| Inflating scope ("I built a streaming platform") | The interviewer will probe and your story will collapse |

## How many projects you actually need

**One** great project beats five mediocre ones.

If you have one project that hits all three archetype boxes (end-to-end + an optimization story inside it + at least one quality concern addressed), that's enough.

If you have time for two, the second should be a *different* archetype. Don't build two end-to-end pipelines.

Three is the maximum that makes it onto a resume. Beyond that, prune.

## The 1-week test

Pick a project. Ask: "Could a smart engineer reproduce this in a week using my README?"

- **If yes:** the project is too small. Add scale, add a real problem, deepen the optimization or quality story.
- **If no, but with 2–3 weeks of effort they could:** that's the sweet spot.
- **If it would take them 3+ months:** you've over-scoped. The reviewer will not believe you actually built and tested it; you'll get fewer interviews, not more.

## A final, opinionated rule

Build the project that solves a problem you've actually had. Not a problem you imagine someone might have.

The best DE portfolios I've seen — the ones that lead to "we want to fast-track this candidate" — are almost always rooted in a real frustration. The author lived it, fixed it, wrote it down. That authenticity is unfakeable, and hiring managers can sense it across the screen.

If you don't have such a problem yet, go work on someone else's open-source DE project for two weeks. You will find the problem. Then build the fix.
`,
  },
  {
    slug: "salary-negotiation-for-de-roles",
    title: "Salary Negotiation for Data Engineering Roles",
    description:
      "When to negotiate (always), the leverage you have, recruiter scripts that work, how to push on equity vs base, the DE multiplier over backend at FAANG, and how senior+ negotiate vs L4.",
    readTimeMinutes: 14,
    content: `# Salary Negotiation for Data Engineering Roles

You will leave $30K–$200K on the table over your career if you don't negotiate. The cost of negotiating is one slightly awkward phone call. The math is not subtle.

This module is the playbook. It is opinionated, scripted, and DE-specific.

## When to negotiate — always

There is one rule. **Always negotiate.** No exceptions.

The "always" rule is non-obvious because most engineers have heard horror stories ("I negotiated and they rescinded the offer"). Those stories are nearly always either (a) apocryphal, (b) the candidate behaved poorly outside of negotiation, or (c) it was a tiny startup with a single founder running HR.

A FAANG-tier company will not rescind an offer because you asked for more. Their internal compensation calibration *expects* a counter. Recruiters have target bands and stretch bands. The first number is in the target band. The stretch band is for candidates who push.

If a company *would* rescind because you asked for more, you don't want to work there. That's a culture signal, not a negotiation outcome.

## The leverage you actually have

Negotiation is leverage applied through patience. You have leverage from four sources:

### 1. Competing offers (the strongest leverage)

A live, written offer from another company at or near the target offer's level is worth, on average, **15–25% on total comp**. Even a *verbal* competing offer is worth 5–10%.

If you don't have one and you're negotiating, get one. Apply to 2–3 other companies in parallel before you accept anything.

### 2. The willingness to walk

This is the leverage that actually matters. If you're willing to take the current offer no matter what they say, you have no leverage. If you're willing to walk, you have all of it.

You don't have to *want* to walk. You just have to be *willing*. The recruiter can sense the difference in your voice.

### 3. Time

Time is leverage. Every day you delay accepting:
- The recruiter's quarterly target gets closer.
- The hiring manager's headcount risk grows.
- Their replacement-candidate option costs more (the next-best candidate may have already accepted elsewhere).

Never accept on the call. Always say "thank you, can I have until [Friday] to think it over?" Always.

### 4. Specialization signals

DE roles are *specialized*. If you have proven experience in a high-leverage area — petabyte streaming, exactly-once distributed systems, lakehouse migrations, real-time ML feature pipelines — that scarcity itself is leverage. Reference it directly.

## The DE multiplier over generic backend

This is the section nobody tells you. **At FAANG, DE roles are typically banded slightly higher than generic backend SWE roles at the same level.** The multiplier varies but is real:

| Company tier | DE vs SWE same-level total comp |
|---|---|
| FAANG (Google L4 → Meta E4 etc.) | DE is 0%–8% higher; almost never lower |
| Tier-2 tech (Snowflake, Databricks, Stripe) | DE is 5%–15% higher; data is the product |
| Mid-market | DE often equal or slightly higher |
| Late-stage startup | DE varies wildly; sometimes 10%–25% higher because senior DE is rare |

Why the multiplier? Two reasons:
1. **Supply.** Senior DEs who have actually shipped petabyte-scale systems are rarer than senior backend SWEs.
2. **Impact tracing.** A revenue-impacting analytics or feature pipeline has clearer dollar-impact than yet-another-CRUD-service.

If a recruiter quotes you the SWE band for a DE role, push. Don't be aggressive — just informed:

> "I appreciate the offer. Just to make sure we're aligned — based on Levels.fyi and the market data I've seen, senior DE roles at [Company] usually band slightly above generic backend at the same level. Is the offer reflecting the DE band specifically?"

That one sentence often unlocks 3–8% on its own.

## The components of a tech offer

You're not negotiating "salary." You're negotiating a multi-dimensional total comp package. The dimensions:

| Component | Negotiable? | Notes |
|---|---|---|
| Base salary | Yes (modestly) | Usually has the tightest band; expect 5–15% movement |
| Sign-on bonus | Yes (often very) | Cash, often paid in 1–2 chunks; watch the clawback |
| RSU grant (initial) | Yes (significantly) | Frequently the biggest negotiable lever, esp. at FAANG |
| RSU vesting schedule | Sometimes | 4-year, 25/25/25/25 standard; some companies front-load |
| Refresh grants | No upfront | Asked about as "what does typical refresh look like?" |
| Annual bonus target | Rarely | Usually a fixed % of base; mostly fixed |
| Relocation | Yes | Cash bonus or reimbursement; ask if not offered |
| PTO | Sometimes | More common with senior+ |
| Title / level | Rarely without re-interview | Push only if you have specific evidence |
| Start date | Yes | Free leverage — push if you need time |

The right ranking of where to push, in most negotiations:
1. **Equity** (biggest dollars, biggest variance).
2. **Sign-on bonus** (direct cash, low friction).
3. **Base** (smaller % wins but compounds annually).
4. **Title / level** (only if you have a defensible argument).
5. **Start date / relocation** (free wins).

## The phone scripts that actually work

Memorize these. Practice them out loud.

### Script 1 — The "what's your range?" trap

The recruiter says, on call 1:

> "Before we go further, what kind of compensation are you looking for?"

This is the moment that determines 70% of the negotiation. Whoever names a number first usually loses. The wrong answers:

- ❌ "I'm looking for around $200K." (You just capped yourself.)
- ❌ "Whatever's standard for the role." (Sounds weak.)
- ❌ "I make $X now and want a 20% bump." (You just told them how to under-pay you.)

The right answer:

> "I'd love to focus on the role first and make sure we're a strong fit. I'm sure compensation will work out — I trust [Company] has a competitive band for senior DE roles. Can you share the band you're working with so we know we're in the same ballpark?"

This script does three things:
1. Defers the number.
2. Frames you as collaborative, not adversarial.
3. Forces them to name a number first.

If they push:
> "I really do want to make sure I'm being straight with you. My current TC is in the [round number, broad range] zone, and for a move I'd need a clear step up. But honestly, the level and the role matter more to me than the exact number — let's see where we land after the loop and figure out comp from there."

You named a vague range. You didn't anchor low. You signaled you're a real candidate, not a tire-kicker.

### Script 2 — The verbal offer call

The recruiter calls with the verbal:

> "We'd like to extend an offer. Base of $185K, sign-on of $30K, RSU grant of $400K over 4 years. We're really excited..."

Your script:

> "Thank you so much, I'm genuinely excited about the team and the role. I really appreciate you putting this together. Can I ask you to email the details? I want to give it the consideration it deserves before responding. When do you need an answer by?"

That's the *entire* script for call 1. You do not respond to the numbers. You do not say "that's a great offer." You do not say "I was hoping for more." You say thank you, ask for it in writing, and hang up.

The recruiter will say "we'd love an answer by Friday." You say "Friday works, thank you so much."

### Script 3 — The counter call

You've gotten the offer in writing, you've thought about it, and you have a target. Time for the counter call. The script:

> "Hi [Recruiter], thank you again for the offer. I've spent the weekend really thinking about it, and I want to be clear that I'm very excited about the role and the team — [specific thing from the loop]. I want to make this work.
>
> That said, I want to be transparent with you. Based on the market and where I am in my career, I was hoping the package could be in the [target] range. Specifically, the equity feels light for the level — I was expecting closer to [target equity]. The base and sign-on are in a reasonable range, though I'd love to push the sign-on up to [number] if there's flexibility there.
>
> I want to be a great partner here — what can we do to get this to a place where I can sign with full enthusiasm?"

What this script does:
- Re-anchors on excitement (so you're not adversarial).
- Names a target range, not a single number.
- Specifies *which lever* you're pushing (equity), with reasoning ("light for the level").
- Mentions the secondary lever (sign-on) as a "and also" — gives the recruiter something to "compromise" on.
- Ends with collaboration ("great partner... full enthusiasm").

This script lands somewhere between 5%–25% on TC, almost every time.

### Script 4 — The "what's your competing offer?" probe

The recruiter, hearing your counter, asks:

> "Do you have a competing offer? Can you share the details?"

If you have one, the script:

> "I do — I have a written offer from [Company] at [TC range]. I'm not trying to play offers against each other; I'd genuinely prefer to be at [Company]. But I do need the package to be roughly competitive."

If you don't have one and they ask:

> "I'm in late-stage conversations with one other team — I haven't asked them to put a number on paper yet because I wanted to focus on you. What I can tell you is that based on Levels.fyi data and what I've seen in the market for senior DE roles in [region], the band I'm targeting is consistent with what's out there."

Never lie about a competing offer. They will sometimes ask for written proof and you will look terrible. You can be *vague* — that's allowed. You cannot fabricate.

### Script 5 — The push on equity vs base

A subtle move that almost always works at FAANG:

> "I noticed the equity is at the lower end of what I've seen for the level. Is there room to shift some of the value from base to equity? I'm bullish on [Company]'s next 4 years and I'd love a bigger ownership stake."

Why this works:
- It signals confidence in the company (flattering to the recruiter).
- Equity has a *much* bigger band internally than base.
- Recruiters can often grant a bigger equity bump than a base bump because base is calibrated against levels rigidly.
- You may walk away with a structurally better package even if the immediate-cash dollar number is unchanged.

### Script 6 — The follow-up after they "go check"

After your counter, the recruiter says "let me see what I can do" and disappears for 2 days. They come back with a partial bump:

> "Good news — we can get the equity to $440K and bump the sign-on to $40K. We can't move on base."

Your script:

> "Thank you, that genuinely helps and I appreciate you going to bat. The equity bump is meaningful. To get me to a clean yes, is there any chance of getting base to [target base + $5K]? That's the last gap. If that's truly not possible, I understand — and I'd love to find a way to close out today."

What this does:
- Acknowledges the win (don't seem ungrateful).
- Names *exactly* what would close the deal.
- Signals you're ready to sign immediately if they can hit it.
- Gives them an out ("if that's truly not possible").

This usually gets you the last $3K–$8K on base. Sometimes it gets you "we can't move base but we can add $10K to sign-on."

## How to push on equity vs base

Equity is the highest-leverage component to push on at FAANG and well-funded tech. Reasons:

1. **The band is wider.** Base salary at L4 might have a $15K window. Equity grant at L4 might have a $150K window.
2. **Recruiters have more discretion.** Base often requires a comp committee approval; equity often only needs the recruiter's manager.
3. **Vesting compounds.** A bigger initial grant means bigger refreshes (often percentage-based).
4. **Tax treatment can be favorable** depending on your jurisdiction.

The push, in a script:

> "If I could ask one specific thing — could we look at the equity grant? My understanding is the band for L5 DE at [Company] goes up to about [target]. I'd love to be closer to the top of that band given my [specific area of strong fit]."

The best leverage point is *being specific about your fit* in the same sentence as the ask. "I led the migration of three lakehouse projects, which is exactly what this team is doing in their planning doc — I'd love the equity grant to reflect that strategic fit."

## L4 vs Senior+ — different games

The negotiation pattern changes meaningfully by level. Brief overview:

### L4 / Mid-level DE

- Bands are tight. 5–15% upside is realistic.
- Equity is a smaller absolute number, but %-bumps can still be meaningful.
- Sign-on bonus is the easiest lever for the recruiter to grant.
- Don't push too hard on title. L4 is a calibrated decision; arguing for L5 without re-interviewing rarely works.
- A good outcome: 8%–15% above the initial offer.

### L5 / Senior DE

- Bands widen significantly.
- The "DE multiplier" is most pronounced here — push on it.
- Equity is the dominant lever; refresh discussion matters.
- A good outcome: 15%–30% above the initial offer with a competing offer; 8%–15% without.

### L6 / Staff DE

- Bands are wide and partially negotiated within the comp committee.
- The candidate often has multiple competing offers — leverage is high.
- Initial equity grants at $1M+ over 4 years are common; the negotiation surface area is large.
- Conversations include: refresh structure, cliff (if any), early exercise, performance multiplier.
- A good outcome: 20%–40% above the initial verbal, with structural improvements (front-loaded vesting, larger refresh commitment).

### L7+ / Principal DE

- Almost all comp is negotiable. Specialized counsel sometimes makes sense.
- Long-term incentive plans, retention grants, and clawback terms become real.
- Out of scope for this module beyond: hire a comp consultant or a tech-focused employment lawyer for $1K–$3K — it'll pay for itself 50x over.

## The "I'd love to make this work" frame

The single most useful phrase across the entire negotiation is:

> "I want to make this work."

Use it at the start of the counter. Use it at the close. Use it after they push back.

It does three things:
1. Signals you intend to sign, removing the recruiter's biggest fear (wasted time).
2. Frames the conversation as collaborative.
3. Gives you implicit permission to ask for more without seeming greedy.

Companion phrases:
- "I want to be a great partner here."
- "I'd love to find a way to close out today."
- "Help me understand what's possible."

## Things you should never do

| Anti-pattern | Why it costs you |
|---|---|
| Negotiate via email when the recruiter wants a call | Email loses tone; recruiters give more on a call |
| Lie about a competing offer | If they ask for proof, you're done |
| Threaten to walk without meaning it | They'll call your bluff |
| Accept on the verbal call | You give up all leverage |
| Tell them your current salary | In many places it's now illegal for them to ask, and it caps you |
| Negotiate against yourself | If they go quiet, *do not* drop your number |
| Get personal | "I have a mortgage / kid / loan" makes you sound desperate |
| Counter without a target number | "Can you do better?" is the weakest counter |
| Skip the thank-you | Always lead and close with thanks |

## The two-week cushion

Once you accept, ask for a start date that gives you a *minimum* two weeks beyond your notice period. Three to four is better. Reason: you'll need to decompress, do paperwork, possibly relocate. Don't agree to a Monday-after-last-day start. You will burn out before week one of the new job.

This is free leverage. Recruiters expect it. They will say yes.

## Practice — run the loop on yourself

Before your next offer call, practice these out loud (yes, out loud, into a recorder):

1. The "what's your range?" deflection.
2. The thank-you-and-email-it response on the verbal.
3. The counter, with your specific numbers.
4. The "what's the competing offer?" probe response.
5. The closing script after they bump partially.

If you stumble on any of them, run them again. The recruiter has had this conversation 400 times this year. You need to have had it at least 5 times in your living room before you have it for real.

## A final note on dignity

Negotiation is not adversarial. Recruiters at good companies are *paid* to find the number where you say yes. They expect a counter. They will respect you more, not less, for doing this professionally.

The candidates who get the biggest packages are not the ones who are most aggressive. They are the ones who are most prepared, most calm, and most willing to politely walk if the package doesn't work.

Be that candidate.
`,
  },
];

async function main() {
  console.log("🌱 Seeding Resume, Portfolio & Negotiation learning path...\n");

  // Upsert the learning path
  const path = await prisma.learningPath.upsert({
    where: { slug: PATH_SLUG },
    create: {
      slug: PATH_SLUG,
      title: "Resume, Portfolio & Salary Negotiation",
      description:
        "The non-technical half of getting hired as a Data Engineer — the 6-second resume, the portfolio projects that land interviews, and the recruiter scripts that win you $30K–$200K over a career.",
      icon: "💼",
      category: "MISC",
      level: "BEGINNER",
      order: 70,
      isPublished: true,
    },
    update: {
      title: "Resume, Portfolio & Salary Negotiation",
      description:
        "The non-technical half of getting hired as a Data Engineer — the 6-second resume, the portfolio projects that land interviews, and the recruiter scripts that win you $30K–$200K over a career.",
      icon: "💼",
      category: "MISC",
      level: "BEGINNER",
      order: 70,
      isPublished: true,
    },
  });

  console.log(`✅  Path: ${path.slug}\n`);

  for (let i = 0; i < MODULES.length; i++) {
    const m = MODULES[i];
    const result = await prisma.learningModule.upsert({
      where: { pathId_slug: { pathId: path.id, slug: m.slug } },
      create: {
        pathId: path.id,
        slug: m.slug,
        title: m.title,
        description: m.description,
        content: m.content,
        readTimeMinutes: m.readTimeMinutes,
        order: i + 1,
        isPublished: true,
      },
      update: {
        title: m.title,
        description: m.description,
        content: m.content,
        readTimeMinutes: m.readTimeMinutes,
        order: i + 1,
        isPublished: true,
      },
    });
    console.log(`✅  [${i + 1}/${MODULES.length}] ${result.title}`);
  }

  console.log(
    `\n🎉 Seeded "${path.title}" with ${MODULES.length} modules.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
