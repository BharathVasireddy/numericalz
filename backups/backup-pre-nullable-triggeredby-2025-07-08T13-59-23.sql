--
-- PostgreSQL database dump
--

-- Dumped from database version 14.18 (Homebrew)
-- Dumped by pg_dump version 14.18 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: EmailStatus; Type: TYPE; Schema: public; Owner: numericalz_user
--

CREATE TYPE public."EmailStatus" AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'FAILED',
    'BOUNCED'
);


ALTER TYPE public."EmailStatus" OWNER TO numericalz_user;

--
-- Name: LtdAccountsWorkflowStage; Type: TYPE; Schema: public; Owner: numericalz_user
--

CREATE TYPE public."LtdAccountsWorkflowStage" AS ENUM (
    'WAITING_FOR_YEAR_END',
    'PAPERWORK_PENDING_CHASE',
    'PAPERWORK_CHASED',
    'PAPERWORK_RECEIVED',
    'WORK_IN_PROGRESS',
    'DISCUSS_WITH_MANAGER',
    'REVIEW_BY_PARTNER',
    'REVIEW_DONE_HELLO_SIGN',
    'SENT_TO_CLIENT_HELLO_SIGN',
    'APPROVED_BY_CLIENT',
    'SUBMISSION_APPROVED_PARTNER',
    'FILED_TO_COMPANIES_HOUSE',
    'FILED_TO_HMRC',
    'CLIENT_SELF_FILING',
    'REVIEWED_BY_MANAGER',
    'REVIEWED_BY_PARTNER'
);


ALTER TYPE public."LtdAccountsWorkflowStage" OWNER TO numericalz_user;

--
-- Name: VATWorkflowStage; Type: TYPE; Schema: public; Owner: numericalz_user
--

CREATE TYPE public."VATWorkflowStage" AS ENUM (
    'CLIENT_BOOKKEEPING',
    'WORK_IN_PROGRESS',
    'QUERIES_PENDING',
    'REVIEW_PENDING_MANAGER',
    'REVIEW_PENDING_PARTNER',
    'EMAILED_TO_PARTNER',
    'EMAILED_TO_CLIENT',
    'CLIENT_APPROVED',
    'FILED_TO_HMRC',
    'PAPERWORK_CHASED',
    'PAPERWORK_RECEIVED',
    'PAPERWORK_PENDING_CHASE',
    'WAITING_FOR_QUARTER_END',
    'REVIEWED_BY_MANAGER',
    'REVIEWED_BY_PARTNER'
);


ALTER TYPE public."VATWorkflowStage" OWNER TO numericalz_user;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO numericalz_user;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.accounts (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);


ALTER TABLE public.accounts OWNER TO numericalz_user;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.activity_logs (
    id text NOT NULL,
    action text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text,
    "clientId" text,
    details text
);


ALTER TABLE public.activity_logs OWNER TO numericalz_user;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.clients (
    id text NOT NULL,
    "clientCode" text NOT NULL,
    "companyName" text NOT NULL,
    "companyNumber" text,
    "companyType" text,
    "companyStatus" text,
    "companyStatusDetail" text,
    "incorporationDate" timestamp(3) without time zone,
    "cessationDate" timestamp(3) without time zone,
    "registeredOfficeAddress" text,
    "sicCodes" text,
    "nextAccountsDue" timestamp(3) without time zone,
    "lastAccountsMadeUpTo" timestamp(3) without time zone,
    "nextConfirmationDue" timestamp(3) without time zone,
    "lastConfirmationMadeUpTo" timestamp(3) without time zone,
    jurisdiction text,
    "hasBeenLiquidated" boolean DEFAULT false NOT NULL,
    "hasCharges" boolean DEFAULT false NOT NULL,
    "hasInsolvencyHistory" boolean DEFAULT false NOT NULL,
    officers text,
    "personsWithSignificantControl" text,
    "contactName" text NOT NULL,
    "contactEmail" text NOT NULL,
    "contactPhone" text,
    "contactFax" text,
    website text,
    "vatNumber" text,
    "yearEstablished" integer,
    "numberOfEmployees" integer,
    "annualTurnover" double precision,
    "paperworkFrequency" text,
    "assignedUserId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "additionalComments" text,
    "annualAccountingScheme" boolean DEFAULT false NOT NULL,
    "businessType" text,
    "dormantStatus" boolean DEFAULT false NOT NULL,
    "flatRatePercentage" double precision,
    "jobCompleted" boolean DEFAULT false NOT NULL,
    "jobCompletedDate" timestamp(3) without time zone,
    "nationalInsuranceNumber" text,
    "natureOfTrade" text,
    "numberOfPartners" integer,
    "paperWorkReceived" boolean DEFAULT false NOT NULL,
    "paperWorkReceivedDate" timestamp(3) without time zone,
    "partnershipTaxReturn" boolean DEFAULT false NOT NULL,
    "previousYearEnded" timestamp(3) without time zone,
    "previousYearJobCompletedDate" timestamp(3) without time zone,
    "previousYearSA100FiledDate" timestamp(3) without time zone,
    "previousYearWorkReceivedDate" timestamp(3) without time zone,
    "residentialAddressCountry" text,
    "residentialAddressLine1" text,
    "residentialAddressLine2" text,
    "residentialAddressPostCode" text,
    "sa100Filed" boolean DEFAULT false NOT NULL,
    "sa100FiledDate" timestamp(3) without time zone,
    "smallCompanyExemption" boolean DEFAULT false NOT NULL,
    staff text,
    "tradingAddressCountry" text,
    "tradingAddressLine1" text,
    "tradingAddressLine2" text,
    "tradingAddressPostCode" text,
    "utrNumber" text,
    "vatDeregistrationDate" timestamp(3) without time zone,
    "vatFrequency" text,
    "vatRegistrationDate" timestamp(3) without time zone,
    "vatScheme" text,
    "workStatus" text,
    "isVatEnabled" boolean DEFAULT false NOT NULL,
    "nextVatReturnDue" timestamp(3) without time zone,
    "preferredContactMethod" text,
    "requiresBookkeeping" boolean DEFAULT false NOT NULL,
    "requiresManagementAccounts" boolean DEFAULT false NOT NULL,
    "requiresPayroll" boolean DEFAULT false NOT NULL,
    "specialInstructions" text,
    "vatReturnsFrequency" text,
    "handlesAnnualAccounts" boolean DEFAULT true NOT NULL,
    "nextCorporationTaxDue" timestamp(3) without time zone,
    "corporationTaxPeriodEnd" timestamp(3) without time zone,
    "corporationTaxPeriodStart" timestamp(3) without time zone,
    "corporationTaxStatus" text DEFAULT 'UNKNOWN'::text,
    "ctDueSource" text DEFAULT 'AUTO'::text,
    "ctStatusUpdatedBy" text,
    "lastCTStatusUpdate" timestamp(3) without time zone,
    "manualCTDueOverride" timestamp(3) without time zone,
    "vatQuarterGroup" text,
    "ltdCompanyAssignedUserId" text,
    "natureOfBusiness" text,
    "nonLtdCompanyAssignedUserId" text,
    "registeredOfficeAddressCity" text,
    "registeredOfficeAddressCountry" text,
    "registeredOfficeAddressCounty" text,
    "registeredOfficeAddressLine1" text,
    "registeredOfficeAddressLine2" text,
    "registeredOfficeAddressPostCode" text,
    "vatAssignedUserId" text,
    "chaseTeamUserIds" text[] DEFAULT ARRAY[]::text[],
    "nextYearEnd" timestamp(3) without time zone
);


ALTER TABLE public.clients OWNER TO numericalz_user;

--
-- Name: communications; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.communications (
    id text NOT NULL,
    type text NOT NULL,
    subject text NOT NULL,
    content text NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "scheduledAt" timestamp(3) without time zone,
    "clientId" text NOT NULL,
    "sentByUserId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.communications OWNER TO numericalz_user;

--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.email_logs (
    id text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "recipientEmail" text NOT NULL,
    "recipientName" text,
    subject text NOT NULL,
    content text NOT NULL,
    "emailType" text NOT NULL,
    status public."EmailStatus" DEFAULT 'PENDING'::public."EmailStatus" NOT NULL,
    "sentAt" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "failedAt" timestamp(3) without time zone,
    "failureReason" text,
    "clientId" text,
    "workflowType" text,
    "workflowId" text,
    "triggeredBy" text NOT NULL,
    "fromEmail" text DEFAULT 'noreply@numericalz.com'::text,
    "fromName" text DEFAULT 'Numericalz'::text,
    "templateId" text,
    "templateData" text
);


ALTER TABLE public.email_logs OWNER TO numericalz_user;

--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.email_templates (
    id text NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    "htmlContent" text NOT NULL,
    "textContent" text,
    variables text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.email_templates OWNER TO numericalz_user;

--
-- Name: ltd_accounts_workflow_history; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.ltd_accounts_workflow_history (
    id text NOT NULL,
    "ltdAccountsWorkflowId" text NOT NULL,
    "fromStage" public."LtdAccountsWorkflowStage",
    "toStage" public."LtdAccountsWorkflowStage" NOT NULL,
    "stageChangedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text NOT NULL,
    "userName" text NOT NULL,
    "userEmail" text NOT NULL,
    "userRole" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "daysInPreviousStage" integer
);


ALTER TABLE public.ltd_accounts_workflow_history OWNER TO numericalz_user;

--
-- Name: ltd_accounts_workflows; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.ltd_accounts_workflows (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "filingPeriodStart" timestamp(3) without time zone NOT NULL,
    "filingPeriodEnd" timestamp(3) without time zone NOT NULL,
    "accountsDueDate" timestamp(3) without time zone NOT NULL,
    "ctDueDate" timestamp(3) without time zone NOT NULL,
    "csDueDate" timestamp(3) without time zone NOT NULL,
    "currentStage" public."LtdAccountsWorkflowStage" DEFAULT 'PAPERWORK_PENDING_CHASE'::public."LtdAccountsWorkflowStage" NOT NULL,
    "assignedUserId" text,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "chaseStartedDate" timestamp(3) without time zone,
    "chaseStartedByUserId" text,
    "chaseStartedByUserName" text,
    "paperworkReceivedDate" timestamp(3) without time zone,
    "paperworkReceivedByUserId" text,
    "paperworkReceivedByUserName" text,
    "workStartedDate" timestamp(3) without time zone,
    "workStartedByUserId" text,
    "workStartedByUserName" text,
    "managerDiscussionDate" timestamp(3) without time zone,
    "managerDiscussionByUserId" text,
    "managerDiscussionByUserName" text,
    "partnerReviewDate" timestamp(3) without time zone,
    "partnerReviewByUserId" text,
    "partnerReviewByUserName" text,
    "reviewCompletedDate" timestamp(3) without time zone,
    "reviewCompletedByUserId" text,
    "reviewCompletedByUserName" text,
    "sentToClientDate" timestamp(3) without time zone,
    "sentToClientByUserId" text,
    "sentToClientByUserName" text,
    "clientApprovedDate" timestamp(3) without time zone,
    "clientApprovedByUserId" text,
    "clientApprovedByUserName" text,
    "partnerApprovedDate" timestamp(3) without time zone,
    "partnerApprovedByUserId" text,
    "partnerApprovedByUserName" text,
    "filedDate" timestamp(3) without time zone,
    "filedByUserId" text,
    "filedByUserName" text,
    "filedToCompaniesHouseDate" timestamp(3) without time zone,
    "filedToCompaniesHouseByUserId" text,
    "filedToCompaniesHouseByUserName" text,
    "filedToHMRCDate" timestamp(3) without time zone,
    "filedToHMRCByUserId" text,
    "filedToHMRCByUserName" text,
    "clientSelfFilingDate" timestamp(3) without time zone,
    "clientSelfFilingByUserId" text,
    "clientSelfFilingByUserName" text
);


ALTER TABLE public.ltd_accounts_workflows OWNER TO numericalz_user;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    data text,
    "userId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.notifications OWNER TO numericalz_user;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO numericalz_user;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.settings (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.settings OWNER TO numericalz_user;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.user_settings (
    id text NOT NULL,
    "userId" text NOT NULL,
    "defaultAssigneeId" text,
    "emailNotifications" boolean DEFAULT true NOT NULL,
    "smsNotifications" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ltdWorkflowAutomationEnabled" boolean DEFAULT false NOT NULL
);


ALTER TABLE public.user_settings OWNER TO numericalz_user;

--
-- Name: users; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.users (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    password text NOT NULL,
    role text DEFAULT 'STAFF'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isOtpVerified" boolean DEFAULT false NOT NULL,
    "lastOtpSentAt" timestamp(3) without time zone,
    "otpAttempts" integer DEFAULT 0 NOT NULL,
    "otpCode" text,
    "otpExpiresAt" timestamp(3) without time zone
);


ALTER TABLE public.users OWNER TO numericalz_user;

--
-- Name: vat_quarters; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.vat_quarters (
    id text NOT NULL,
    "clientId" text NOT NULL,
    "quarterPeriod" text NOT NULL,
    "quarterStartDate" timestamp(3) without time zone NOT NULL,
    "quarterEndDate" timestamp(3) without time zone NOT NULL,
    "filingDueDate" timestamp(3) without time zone NOT NULL,
    "quarterGroup" text NOT NULL,
    "currentStage" public."VATWorkflowStage" DEFAULT 'PAPERWORK_PENDING_CHASE'::public."VATWorkflowStage" NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "assignedUserId" text,
    "chaseStartedDate" timestamp(3) without time zone,
    "chaseStartedByUserId" text,
    "chaseStartedByUserName" text,
    "paperworkReceivedDate" timestamp(3) without time zone,
    "paperworkReceivedByUserId" text,
    "paperworkReceivedByUserName" text,
    "workStartedDate" timestamp(3) without time zone,
    "workStartedByUserId" text,
    "workStartedByUserName" text,
    "workFinishedDate" timestamp(3) without time zone,
    "workFinishedByUserId" text,
    "workFinishedByUserName" text,
    "sentToClientDate" timestamp(3) without time zone,
    "sentToClientByUserId" text,
    "sentToClientByUserName" text,
    "clientApprovedDate" timestamp(3) without time zone,
    "clientApprovedByUserId" text,
    "clientApprovedByUserName" text,
    "filedToHMRCDate" timestamp(3) without time zone,
    "filedToHMRCByUserId" text,
    "filedToHMRCByUserName" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.vat_quarters OWNER TO numericalz_user;

--
-- Name: vat_workflow_history; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.vat_workflow_history (
    id text NOT NULL,
    "vatQuarterId" text NOT NULL,
    "fromStage" public."VATWorkflowStage",
    "toStage" public."VATWorkflowStage" NOT NULL,
    "stageChangedAt" timestamp(3) without time zone NOT NULL,
    "daysInPreviousStage" integer,
    "userId" text,
    "userName" text NOT NULL,
    "userEmail" text NOT NULL,
    "userRole" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.vat_workflow_history OWNER TO numericalz_user;

--
-- Name: verificationtokens; Type: TABLE; Schema: public; Owner: numericalz_user
--

CREATE TABLE public.verificationtokens (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.verificationtokens OWNER TO numericalz_user;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
aa5ce920-49f1-479a-a452-6c9797c9e02e	c42e0c31bdff1028a2e8c40f40bf4eacc9a88827b58d4d011d78697433e3902d	2025-07-08 12:14:47.286669+05:30	20250625125031_add_waiting_for_quarter_end	\N	\N	2025-07-08 12:14:47.279865+05:30	1
16707f3a-f38f-4c10-abb4-fee3aaa59b86	1b8f79a1bcc1faf1ec1c2658f662bb9761fb25ac5799e7ed850d7781f28a82d2	2025-07-08 12:14:47.18186+05:30	20250617041908_init_postgresql	\N	\N	2025-07-08 12:14:47.101258+05:30	1
827853c1-c5aa-46d7-986d-1531c4449a7b	28fa3e51e5aedc071132abba15859f06fadddd550ca37ef513b6fbd8d66c4405	2025-07-08 12:14:47.194353+05:30	20250618063738_add_missing_client_fields_complete	\N	\N	2025-07-08 12:14:47.182865+05:30	1
d30bc56b-8561-4d18-be4a-077f7a10b7b6	08f73c7ee9562689c2a3c5e3dfdc2a78b0f81dd898f175f8dc3fc2c3a2a5572d	2025-07-08 12:14:47.206008+05:30	20250618063943_add_user_settings	\N	\N	2025-07-08 12:14:47.195695+05:30	1
c03e6183-947c-44e5-92c8-17d3f110eadc	d92edecc554cf957585b528d169815ef4efb1e811bcecfcb845d7c780f0dd5a5	2025-07-08 12:14:47.338646+05:30	20250703181148_setup_local_development	\N	\N	2025-07-08 12:14:47.288293+05:30	1
4c1c93cf-dd77-48e1-ad25-894e27c538a0	503db02032f463046903c6dd23d190005c5a075d618f7789c536110882846cb1	2025-07-08 12:14:47.209712+05:30	20250618075841_add_client_questionnaire_fields	\N	\N	2025-07-08 12:14:47.206939+05:30	1
eec8a6cf-9ec1-4b1b-9401-71aecc8c28ce	2b267ad93bf7e79c389141fa337c4168d2d01056d4f78b969fdd5fa3bd723716	2025-07-08 12:14:47.212505+05:30	20250618085633_add_handles_annual_accounts_field	\N	\N	2025-07-08 12:14:47.210427+05:30	1
5598adfb-18e3-4c12-9ff4-211f3391fb16	fb4f2e3ecd0bb7edb652a070bc08e3db5b9c0993f8aad09e154410e9d66d5475	\N	20250704190300_add_missing_email_communication_tables	A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve\n\nMigration name: 20250704190300_add_missing_email_communication_tables\n\nDatabase error code: 42P07\n\nDatabase error:\nERROR: relation "email_templates" already exists\n\nDbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E42P07), message: "relation \\"email_templates\\" already exists", detail: None, hint: None, position: None, where_: None, schema: None, table: None, column: None, datatype: None, constraint: None, file: Some("heap.c"), line: Some(1203), routine: Some("heap_create_with_catalog") }\n\n   0: sql_schema_connector::apply_migration::apply_script\n           with migration_name="20250704190300_add_missing_email_communication_tables"\n             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:106\n   1: schema_core::commands::apply_migrations::Applying migration\n           with migration_name="20250704190300_add_missing_email_communication_tables"\n             at schema-engine/core/src/commands/apply_migrations.rs:91\n   2: schema_core::state::ApplyMigrations\n             at schema-engine/core/src/state.rs:226	\N	2025-07-08 12:14:47.341413+05:30	0
d3818ae9-d700-45f0-ad88-ffcd3f0a9efa	2810ba0933ea086ea899632156bf1b479800e7b59a50c34ca85b289207d030f5	2025-07-08 12:14:47.220061+05:30	20250618104233_add_corporation_tax_due_field	\N	\N	2025-07-08 12:14:47.214627+05:30	1
10fa759e-d8ab-48d7-8ce0-ceff585bed4a	5dc0edfe49f723b953389f616dcbb3321a3d355c4909119b9c587807864e4d2b	2025-07-08 12:14:47.227123+05:30	20250618131406_add_ct_tracking_fields	\N	\N	2025-07-08 12:14:47.221136+05:30	1
0cdf143e-ce2b-4a17-9284-a63e75b460b8	ca5f2ebec0d23ca157978b24d21139087b0cec0744631dd13f65c40c89e40071	2025-07-08 12:14:47.231181+05:30	20250618164734_add_vat_quarter_group	\N	\N	2025-07-08 12:14:47.227965+05:30	1
22c83e39-9beb-4254-a9f8-d4ac94e73026	9ade8bb00efe9d61d1dbbd2ca92362ad0299927f7eb3a6aeddfdd44883db3a7f	2025-07-08 12:14:47.253358+05:30	20250618173938_add_vat_workflow_system	\N	\N	2025-07-08 12:14:47.232372+05:30	1
d66cee90-c386-4da6-a76b-6832935a73db	6f5becdf8b2c1ceeabc78eb6cb15e7d57a8f425d2c8e40dbc4818de9defd6fcb	2025-07-08 12:14:47.272224+05:30	20250619094247_add_enhanced_assignment_system	\N	\N	2025-07-08 12:14:47.255656+05:30	1
e5fe9989-f465-4560-83fc-202ce9b529f2	80aee1f821666370d56ee233ad5cd9c940203ddb5ab711ca0426a9f8b5dd252d	2025-07-08 12:14:47.276408+05:30	20250620182410_add_paperwork_workflow_stages	\N	\N	2025-07-08 12:14:47.274365+05:30	1
d2f5a958-79bd-4f23-a5dc-762e6351f090	d0f238d5b269ba7b9ab49240999e3cb88e52cb0898d693efed1ec7df8057bab9	2025-07-08 12:14:47.278929+05:30	20250620193222_add_paperwork_pending_chase_stage	\N	\N	2025-07-08 12:14:47.277134+05:30	1
\.


--
-- Data for Name: accounts; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.accounts (id, "userId", type, provider, "providerAccountId", refresh_token, access_token, expires_at, token_type, scope, id_token, session_state) FROM stdin;
\.


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.activity_logs (id, action, "timestamp", "userId", "clientId", details) FROM stdin;
cmcu712760003826roqnyggn0	OTP_SENT	2025-07-08 07:13:10.243	emergency_user_1751958748	\N	{"email":"vasireddybharatsai@gmail.com","timestamp":"2025-07-08T07:13:10.241Z","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}
cmcu71pyv0005826rt06x3kqj	OTP_VERIFIED	2025-07-08 07:13:41.047	emergency_user_1751958748	\N	{"email":"vasireddybharatsai@gmail.com","timestamp":"2025-07-08T07:13:41.037Z","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}
cmcu72xxp0008826rcxlzria9	LOGOUT	2025-07-08 07:14:38.029	emergency_user_1751958748	\N	{"timestamp":"2025-07-08T07:14:38.000Z"}
cmcu73316000c826rvf48drbz	OTP_SENT	2025-07-08 07:14:44.634	cmcu72m8n0006826rtk6akzul	\N	{"email":"bharat@cloud9digital.in","timestamp":"2025-07-08T07:14:44.633Z","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}
cmcu73gsz000e826rfn08yens	OTP_VERIFIED	2025-07-08 07:15:02.483	cmcu72m8n0006826rtk6akzul	\N	{"email":"bharat@cloud9digital.in","timestamp":"2025-07-08T07:15:02.480Z","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}
cmcu74136000h826rtk2hut30	CLIENT_CREATED	2025-07-08 07:15:28.77	cmcu72m8n0006826rtk6akzul	\N	{"companyName":"NUMERICALZ ADVISERS LIMITED","clientCode":"NZ-1","companyNumber":"11903549","ip":"::1","timestamp":"2025-07-08T07:15:28.000Z"}
cmcu74mep000n826rdym0z2hg	VAT_QUARTER_ASSIGNED	2025-07-08 07:15:56.402	cmcu72m8n0006826rtk6akzul	cmcu7412p000f826rf1izc2f6	{"companyName":"NUMERICALZ ADVISERS LIMITED","clientCode":"NZ-1","workflowType":"VAT","assigneeId":"cmcu72m8n0006826rtk6akzul","assigneeName":"Partner Bharat","quarterPeriod":"2025-04-01_to_2025-06-30","previousAssignee":null,"quarterStartDate":"2025-04-01T00:00:00.000Z","quarterEndDate":"2025-06-30T00:00:00.000Z","filingDueDate":"2025-07-31T00:00:00.000Z","ip":"::1","timestamp":"2025-07-08T07:15:56.000Z"}
cmcu74n58000r826robvemkky	VAT_ASSIGNMENT_EMAIL_SENT	2025-07-08 07:15:57.356	cmcu72m8n0006826rtk6akzul	cmcu7412p000f826rf1izc2f6	{"recipientEmail":"bharat@cloud9digital.in","recipientName":"Partner Bharat","companyName":"NUMERICALZ ADVISERS LIMITED","quarterPeriod":"2025-04-01_to_2025-06-30","messageId":"<202507080715.89831150126@smtp-relay.mailin.fr>","emailType":"VAT_ASSIGNMENT_NOTIFICATION","ip":"::1","timestamp":"2025-07-08T07:15:57.000Z"}
cmcu7a6nd000t826rskrib64v	VAT_QUARTER_UNASSIGNED	2025-07-08 07:20:15.914	cmcu72m8n0006826rtk6akzul	cmcu7412p000f826rf1izc2f6	{"companyName":"NUMERICALZ ADVISERS LIMITED","clientCode":"NZ-1","workflowType":"VAT","quarterPeriod":"2025-04-01_to_2025-06-30","previousAssignee":"Partner Bharat","quarterStartDate":"2025-04-01T00:00:00.000Z","quarterEndDate":"2025-06-30T00:00:00.000Z","filingDueDate":"2025-07-31T00:00:00.000Z","ip":"::1","timestamp":"2025-07-08T07:20:15.000Z"}
cmcu7accl000x826r943sy0od	VAT_QUARTER_ASSIGNED	2025-07-08 07:20:23.302	cmcu72m8n0006826rtk6akzul	cmcu7412p000f826rf1izc2f6	{"workflowType":"VAT","assigneeId":"emergency_user_1751958748","assigneeName":"Staff Bharat","quarterPeriod":"2025-04-01_to_2025-06-30","previousAssignee":"Unassigned","ip":"::1","timestamp":"2025-07-08T07:20:23.000Z"}
cmcu7adz60011826r5otah7p2	VAT_ASSIGNMENT_EMAIL_SENT	2025-07-08 07:20:25.411	cmcu72m8n0006826rtk6akzul	cmcu7412p000f826rf1izc2f6	{"recipientEmail":"vasireddybharatsai@gmail.com","recipientName":"Staff Bharat","companyName":"NUMERICALZ ADVISERS LIMITED","quarterPeriod":"2025-04-01_to_2025-06-30","messageId":"<202507080720.97641111130@smtp-relay.mailin.fr>","emailType":"VAT_ASSIGNMENT_NOTIFICATION","ip":"::1","timestamp":"2025-07-08T07:20:25.000Z"}
cmcu8ft360002806tgqmogdf2	CLIENT_CREATED	2025-07-08 07:52:37.891	cmcu72m8n0006826rtk6akzul	\N	{"companyName":"MAYA101PVT LIMITED","clientCode":"NZ-2","companyNumber":"14999760","ip":"::1","timestamp":"2025-07-08T07:52:37.000Z"}
cmcu8j3ob000a806t6tii34ap	VAT_QUARTER_ASSIGNED	2025-07-08 07:55:11.58	cmcu72m8n0006826rtk6akzul	cmcu8ft2p0000806tm5ihul5z	{"workflowType":"VAT","assigneeId":"emergency_user_1751958748","assigneeName":"Staff Bharat","quarterPeriod":"2025-04-01_to_2025-06-30","previousAssignee":"Unassigned","ip":"::1","timestamp":"2025-07-08T07:55:11.000Z"}
cmcu8j59w000e806t7jc8lpwm	VAT_ASSIGNMENT_EMAIL_SENT	2025-07-08 07:55:13.652	cmcu72m8n0006826rtk6akzul	cmcu8ft2p0000806tm5ihul5z	{"recipientEmail":"vasireddybharatsai@gmail.com","recipientName":"Staff Bharat","companyName":"MAYA101PVT LIMITED","quarterPeriod":"2025-04-01_to_2025-06-30","messageId":"<202507080755.64270405671@smtp-relay.mailin.fr>","emailType":"VAT_ASSIGNMENT_NOTIFICATION","ip":"::1","timestamp":"2025-07-08T07:55:13.000Z"}
cmcu8jvwm000i806t62qnhyod	LOGOUT	2025-07-08 07:55:48.165	cmcu72m8n0006826rtk6akzul	\N	{"timestamp":"2025-07-08T07:55:48.000Z"}
cmcu8k07d000m806t16g3ev6d	OTP_SENT	2025-07-08 07:55:53.737	cmcu72m8n0006826rtk6akzul	\N	{"email":"bharat@cloud9digital.in","timestamp":"2025-07-08T07:55:53.736Z","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}
cmcu8ke13000o806tklxdrg0n	OTP_VERIFIED	2025-07-08 07:56:11.656	cmcu72m8n0006826rtk6akzul	\N	{"email":"bharat@cloud9digital.in","timestamp":"2025-07-08T07:56:11.609Z","userAgent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"}
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.clients (id, "clientCode", "companyName", "companyNumber", "companyType", "companyStatus", "companyStatusDetail", "incorporationDate", "cessationDate", "registeredOfficeAddress", "sicCodes", "nextAccountsDue", "lastAccountsMadeUpTo", "nextConfirmationDue", "lastConfirmationMadeUpTo", jurisdiction, "hasBeenLiquidated", "hasCharges", "hasInsolvencyHistory", officers, "personsWithSignificantControl", "contactName", "contactEmail", "contactPhone", "contactFax", website, "vatNumber", "yearEstablished", "numberOfEmployees", "annualTurnover", "paperworkFrequency", "assignedUserId", "isActive", notes, "createdAt", "updatedAt", "additionalComments", "annualAccountingScheme", "businessType", "dormantStatus", "flatRatePercentage", "jobCompleted", "jobCompletedDate", "nationalInsuranceNumber", "natureOfTrade", "numberOfPartners", "paperWorkReceived", "paperWorkReceivedDate", "partnershipTaxReturn", "previousYearEnded", "previousYearJobCompletedDate", "previousYearSA100FiledDate", "previousYearWorkReceivedDate", "residentialAddressCountry", "residentialAddressLine1", "residentialAddressLine2", "residentialAddressPostCode", "sa100Filed", "sa100FiledDate", "smallCompanyExemption", staff, "tradingAddressCountry", "tradingAddressLine1", "tradingAddressLine2", "tradingAddressPostCode", "utrNumber", "vatDeregistrationDate", "vatFrequency", "vatRegistrationDate", "vatScheme", "workStatus", "isVatEnabled", "nextVatReturnDue", "preferredContactMethod", "requiresBookkeeping", "requiresManagementAccounts", "requiresPayroll", "specialInstructions", "vatReturnsFrequency", "handlesAnnualAccounts", "nextCorporationTaxDue", "corporationTaxPeriodEnd", "corporationTaxPeriodStart", "corporationTaxStatus", "ctDueSource", "ctStatusUpdatedBy", "lastCTStatusUpdate", "manualCTDueOverride", "vatQuarterGroup", "ltdCompanyAssignedUserId", "natureOfBusiness", "nonLtdCompanyAssignedUserId", "registeredOfficeAddressCity", "registeredOfficeAddressCountry", "registeredOfficeAddressCounty", "registeredOfficeAddressLine1", "registeredOfficeAddressLine2", "registeredOfficeAddressPostCode", "vatAssignedUserId", "chaseTeamUserIds", "nextYearEnd") FROM stdin;
cmcu7412p000f826rf1izc2f6	NZ-1	NUMERICALZ ADVISERS LIMITED	11903549	LIMITED_COMPANY	active	\N	2019-03-25 00:00:00	\N	{"address_line_1":"186 Petts Wood Road","address_line_2":"Petts Wood","country":"England","locality":"Orpington","postal_code":"BR5 1LG","region":"Kent"}	["69201","69202"]	2025-12-30 00:00:00	2024-03-31 00:00:00	2026-04-07 00:00:00	2025-03-24 00:00:00	england-wales	f	f	f	{"active_count":1,"etag":"758e71fde767e8b47df47d8edfc11b1ae493f1ac","items":[{"address":{"address_line_1":"Petts Wood Road","address_line_2":"Petts Wood","country":"England","locality":"Orpington","postal_code":"BR5 1LG","premises":"186","region":"Kent"},"appointed_on":"2019-03-25","is_pre_1992_appointment":false,"country_of_residence":"England","date_of_birth":{"month":7,"year":1985},"links":{"self":"/company/11903549/appointments/hZ84uQKD9BkyIx84xgy28jEckqY","officer":{"appointments":"/officers/3zBmApzBlsPQkk_xEOhwDgD_Yjw/appointments"}},"name":"MALIK, Mukul","nationality":"British","occupation":"Accountant","officer_role":"director","person_number":"256734150002"}],"items_per_page":35,"kind":"officer-list","links":{"self":"/company/11903549/officers"},"resigned_count":0,"inactive_count":0,"start_index":0,"total_results":1}	{"items_per_page":25,"items":[{"etag":"fa8572b3dba6f8d636156476a3bd6b4303d1083d","notified_on":"2019-03-25","country_of_residence":"United Kingdom","date_of_birth":{"month":7,"year":1985},"name":"Mr Mukul Malik","name_elements":{"title":"Mr","surname":"Malik","forename":"Mukul"},"links":{"self":"/company/11903549/persons-with-significant-control/individual/TqhuSgqehAM5g1Zy7YtdMb9FWJA"},"nationality":"British","ceased":false,"kind":"individual-person-with-significant-control","address":{"address_line_1":"Petts Wood Road","address_line_2":"Petts Wood","country":"England","locality":"Orpington","postal_code":"BR5 1LG","premises":"186","region":"Kent"},"natures_of_control":["ownership-of-shares-75-to-100-percent","voting-rights-75-to-100-percent","right-to-appoint-and-remove-directors"]}],"start_index":0,"total_results":1,"active_count":1,"ceased_count":0,"links":{"self":"/company/11903549/persons-with-significant-control"}}	NUMERICALZ ADVISERS LIMITED	contact@example.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2025-07-08 07:15:28.753	2025-07-08 07:15:36.389	\N	f	\N	f	\N	f	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2025-07-31 00:00:00	\N	f	f	f	\N	QUARTERLY	t	2026-03-31 00:00:00	2025-03-31 00:00:00	2024-04-01 00:00:00	PENDING	AUTO	\N	\N	\N	3_6_9_12	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	2025-03-30 00:00:00
cmcu8ft2p0000806tm5ihul5z	NZ-2	MAYA101PVT LIMITED	14999760	LIMITED_COMPANY	active	\N	2023-07-12 00:00:00	\N	{"address_line_1":"29 Hollingworth Road","address_line_2":"Petts Wood","country":"England","locality":"Orpington","postal_code":"BR5 1AQ"}	["68100","68209","68320"]	2025-07-12 00:00:00	\N	2025-08-21 00:00:00	2024-08-07 00:00:00	england-wales	f	f	f	{"active_count":2,"etag":"1bd9d23aeeedac66e84316e78473b8e4b4f9561d","items":[{"address":{"address_line_1":"Hollingworth Road","address_line_2":"Petts Wood","country":"England","locality":"Orpington","postal_code":"BR5 1AQ","premises":"29"},"appointed_on":"2023-07-12","is_pre_1992_appointment":false,"country_of_residence":"England","date_of_birth":{"month":6,"year":1977},"links":{"self":"/company/14999760/appointments/Qz3NlkqU9xbDieNwJ5R0af04mMI","officer":{"appointments":"/officers/FL1_RdDYOw-NCHrXIm_h3psqA2A/appointments"}},"name":"KANDIKONDA, Yeshwant Das","nationality":"British","occupation":"Consultant","officer_role":"director","person_number":"311232590001"},{"address":{"address_line_1":"Hollingworth Road","address_line_2":"Petts Wood","country":"England","locality":"Orpington","postal_code":"BR5 1AQ","premises":"29"},"appointed_on":"2023-07-12","is_pre_1992_appointment":false,"country_of_residence":"England","date_of_birth":{"month":8,"year":1982},"links":{"self":"/company/14999760/appointments/XQRuchJA-Xcl03-M7SseBl--2PY","officer":{"appointments":"/officers/mfo3_spNgXLayLziFbGfgacz2PQ/appointments"}},"name":"MEHTA, Meeta","nationality":"British","occupation":"Engineer","officer_role":"director","person_number":"311232600001"}],"items_per_page":35,"kind":"officer-list","links":{"self":"/company/14999760/officers"},"resigned_count":0,"inactive_count":0,"start_index":0,"total_results":2}	{"items_per_page":25,"items":[{"etag":"c875f2acddc6c1fe79d1b28704a1d630fdca8340","notified_on":"2023-07-12","country_of_residence":"England","date_of_birth":{"month":6,"year":1977},"name":"Mr Yeshwant Das Kandikonda","name_elements":{"title":"Mr","surname":"Kandikonda","forename":"Yeshwant","middle_name":"Das"},"links":{"self":"/company/14999760/persons-with-significant-control/individual/arQbEtqWr6NR3wMSUFPjOwbSyKQ"},"nationality":"British","ceased":false,"kind":"individual-person-with-significant-control","address":{"address_line_1":"Hollingworth Road","address_line_2":"Petts Wood","country":"England","locality":"Orpington","postal_code":"BR5 1AQ","premises":"29"},"natures_of_control":["ownership-of-shares-25-to-50-percent","voting-rights-25-to-50-percent","right-to-appoint-and-remove-directors"]},{"etag":"289f5e6454a993729dd07fc62a388ca55155d0bc","notified_on":"2023-07-12","country_of_residence":"England","date_of_birth":{"month":8,"year":1982},"name":"Mrs Meeta Mehta","name_elements":{"title":"Mrs","surname":"Mehta","forename":"Meeta"},"links":{"self":"/company/14999760/persons-with-significant-control/individual/3woYK4LYzRngJGI3jeeGsJoR96s"},"nationality":"British","ceased":false,"kind":"individual-person-with-significant-control","address":{"address_line_1":"Hollingworth Road","address_line_2":"Petts Wood","country":"England","locality":"Orpington","postal_code":"BR5 1AQ","premises":"29"},"natures_of_control":["ownership-of-shares-25-to-50-percent","voting-rights-25-to-50-percent","right-to-appoint-and-remove-directors"]}],"start_index":0,"total_results":2,"active_count":2,"ceased_count":0,"links":{"self":"/company/14999760/persons-with-significant-control"}}	MAYA101PVT LIMITED	contact@example.com	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	\N	2025-07-08 07:52:37.874	2025-07-08 07:52:47.055	\N	f	\N	f	\N	f	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	f	\N	f	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	t	2025-07-31 00:00:00	\N	f	f	f	\N	QUARTERLY	t	2025-07-12 00:00:00	\N	\N	PENDING	AUTO	\N	\N	\N	3_6_9_12	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{}	2024-07-31 00:00:00
\.


--
-- Data for Name: communications; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.communications (id, type, subject, content, "sentAt", "scheduledAt", "clientId", "sentByUserId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: email_logs; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.email_logs (id, "createdAt", "updatedAt", "recipientEmail", "recipientName", subject, content, "emailType", status, "sentAt", "deliveredAt", "failedAt", "failureReason", "clientId", "workflowType", "workflowId", "triggeredBy", "fromEmail", "fromName", "templateId", "templateData") FROM stdin;
cmcu8j41y000c806t3qakhbf1	2025-07-08 07:55:11.645	2025-07-08 07:55:13.578	vasireddybharatsai@gmail.com	Staff Bharat	VAT Assignment: MAYA101PVT LIMITED - 2025-04-01_to_2025-06-30 Due in 23 days	\n      <!DOCTYPE html>\n      <html lang="en">\n      <head>\n        <meta charset="UTF-8">\n        <meta name="viewport" content="width=device-width, initial-scale=1.0">\n        <title>Numericalz Notification</title>\n        <style>\n          /* Numericalz Email Design System */\n          \n          /* Base Styles */\n          * {\n            margin: 0;\n            padding: 0;\n            box-sizing: border-box;\n          }\n          \n          body { \n            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;\n            line-height: 1.6; \n            color: #1a1a1a !important; \n            margin: 0; \n            padding: 0; \n            background-color: #f8f9fa;\n            -webkit-font-smoothing: antialiased;\n            -moz-osx-font-smoothing: grayscale;\n          }\n          \n          /* Email Container */\n          .email-container { \n            max-width: 700px; \n            margin: 20px auto; \n            background: #ffffff !important; \n            border-radius: 8px; \n            overflow: hidden;\n            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);\n            border: 1px solid #e5e7eb;\n          }\n          \n          /* Header Styles */\n          .header { \n            background: #ffffff;\n            color: #1a1a1a !important; \n            padding: 32px 30px 24px; \n            text-align: left;\n            border-bottom: 1px solid #e5e7eb;\n          }\n          \n          .header h1 { \n            margin: 0; \n            font-size: 24px; \n            font-weight: 600;\n            letter-spacing: -0.025em;\n            color: #1a1a1a !important;\n          }\n          \n          .header .subtitle { \n            margin: 6px 0 0 0; \n            color: #6b7280 !important; \n            font-size: 14px;\n            font-weight: 400;\n          }\n          \n          /* Content Styles */\n          .content { \n            padding: 32px 30px; \n            background: #ffffff !important;\n          }\n          \n          /* Card Components */\n          .assignment-card {\n            background: #f8fafc;\n            border: 1px solid #e2e8f0;\n            border-radius: 8px;\n            padding: 20px;\n            margin: 20px 0;\n            border-left: 3px solid #3b82f6;\n          }\n          \n          .company-info {\n            background: #ffffff !important;\n            border: 1px solid #e5e7eb;\n            border-radius: 8px;\n            padding: 20px;\n            margin: 20px 0;\n          }\n          \n          .company-info h3 {\n            margin: 0 0 16px 0;\n            color: #1a1a1a !important;\n            font-size: 18px;\n            font-weight: 600;\n          }\n          \n          /* Grid System */\n          .info-grid {\n            display: grid;\n            grid-template-columns: 1fr 1fr;\n            gap: 20px;\n            margin: 20px 0;\n          }\n          \n          .info-item {\n            display: flex;\n            flex-direction: column;\n            gap: 4px;\n          }\n          \n          .info-label {\n            font-size: 12px;\n            color: #6b7280;\n            text-transform: uppercase;\n            font-weight: 600;\n            letter-spacing: 0.05em;\n          }\n          \n          .info-value {\n            font-size: 15px;\n            color: #111827;\n            font-weight: 500;\n          }\n          \n          /* Alert Components */\n          .deadline-alert {\n            border-radius: 12px;\n            padding: 20px;\n            margin: 24px 0;\n            border-left: 4px solid;\n          }\n          \n          .deadline-alert h4 {\n            margin: 0 0 8px 0;\n            font-size: 16px;\n            font-weight: 600;\n          }\n          \n          .deadline-alert p {\n            margin: 4px 0;\n            font-size: 14px;\n          }\n          \n          .deadline-alert.overdue {\n            background: #fef2f2;\n            border-color: #dc2626;\n            color: #991b1b;\n          }\n          \n          .deadline-alert.urgent {\n            background: #fffbeb;\n            border-color: #f59e0b;\n            color: #92400e;\n          }\n          \n          .deadline-alert.normal {\n            background: #f0f9ff;\n            border-color: #0ea5e9;\n            color: #0c4a6e;\n          }\n          \n          /* Status Badges */\n          .status-badge {\n            display: inline-block;\n            padding: 6px 12px;\n            border-radius: 6px;\n            font-size: 12px;\n            font-weight: 600;\n            text-transform: uppercase;\n            letter-spacing: 0.025em;\n          }\n          \n          .status-pending { \n            background: #fef3c7; \n            color: #92400e; \n            border: 1px solid #f59e0b;\n          }\n          \n          .status-progress { \n            background: #dbeafe; \n            color: #1e40af; \n            border: 1px solid #3b82f6;\n          }\n          \n          .status-review { \n            background: #f3f4f6; \n            color: #374151; \n            border: 1px solid #6b7280;\n          }\n          \n          /* Button Styles */\n          .action-button {\n            display: inline-block;\n            background: #3b82f6;\n            color: #ffffff !important;\n            padding: 12px 24px;\n            text-decoration: none;\n            border-radius: 6px;\n            font-weight: 500;\n            font-size: 14px;\n            margin: 20px 0;\n            text-align: center;\n            border: 1px solid #3b82f6;\n          }\n          \n          .action-button:hover {\n            background: #2563eb;\n            border-color: #2563eb;\n          }\n          \n          .action-button-secondary {\n            display: inline-block;\n            background: #ffffff !important;\n            color: #374151 !important;\n            padding: 12px 24px;\n            text-decoration: none;\n            border-radius: 6px;\n            font-weight: 500;\n            font-size: 14px;\n            margin: 20px 0;\n            text-align: center;\n            border: 1px solid #d1d5db;\n          }\n          \n          /* Stage Transition */\n          .stage-transition {\n            background: #f8fafc;\n            padding: 20px;\n            border-radius: 12px;\n            margin: 20px 0;\n            border: 1px solid #e2e8f0;\n          }\n          \n          .stage-flow {\n            display: flex;\n            align-items: center;\n            justify-content: space-between;\n            gap: 16px;\n          }\n          \n          .stage-item {\n            text-align: center;\n            flex: 1;\n          }\n          \n          .stage-label {\n            font-size: 12px;\n            color: #6b7280;\n            margin-bottom: 8px;\n            text-transform: uppercase;\n            font-weight: 600;\n            letter-spacing: 0.05em;\n          }\n          \n          .stage-value {\n            padding: 12px 16px;\n            border-radius: 8px;\n            font-weight: 600;\n            font-size: 14px;\n          }\n          \n          .stage-from {\n            background: #f3f4f6;\n            color: #374151;\n            border: 1px solid #d1d5db;\n          }\n          \n          .stage-to {\n            background: #dbeafe;\n            color: #1e40af;\n            border: 1px solid #3b82f6;\n          }\n          \n          .stage-arrow {\n            color: #6b7280;\n            font-size: 24px;\n            font-weight: bold;\n          }\n          \n          /* Comments Section */\n          .comments-section {\n            background: #fffbeb;\n            border: 1px solid #f59e0b;\n            border-radius: 12px;\n            padding: 20px;\n            margin: 20px 0;\n            border-left: 4px solid #f59e0b;\n          }\n          \n          .comments-section h4 {\n            margin: 0 0 12px 0;\n            color: #92400e;\n            font-size: 16px;\n            font-weight: 600;\n          }\n          \n          .comments-section p {\n            margin: 0;\n            color: #92400e;\n            font-size: 14px;\n            line-height: 1.6;\n          }\n          \n          /* Next Steps */\n          .next-steps {\n            background: #f0f9ff;\n            border: 1px solid #0ea5e9;\n            border-radius: 12px;\n            padding: 24px;\n            margin: 24px 0;\n            border-left: 4px solid #0ea5e9;\n          }\n          \n          .next-steps h4 {\n            margin: 0 0 16px 0;\n            color: #0c4a6e;\n            font-size: 18px;\n            font-weight: 600;\n          }\n          \n          .next-steps ul {\n            margin: 0;\n            padding-left: 20px;\n            color: #0c4a6e;\n          }\n          \n          .next-steps li {\n            margin: 8px 0;\n            font-size: 14px;\n            line-height: 1.6;\n          }\n          \n          /* Footer */\n          .footer {\n            background: #f8f9fa;\n            padding: 24px 30px;\n            text-align: center;\n            border-top: 1px solid #e5e7eb;\n          }\n          \n          .footer p {\n            margin: 4px 0;\n            font-size: 12px;\n            color: #6b7280 !important;\n            line-height: 1.4;\n          }\n          \n          .footer .brand {\n            font-weight: 500;\n            color: #374151 !important;\n            font-size: 13px;\n          }\n          \n          /* Responsive Design */\n          @media (max-width: 600px) {\n            .email-container { \n              margin: 10px; \n              border-radius: 12px; \n            }\n            \n            .header, .content { \n              padding: 24px 20px; \n            }\n            \n            .info-grid { \n              grid-template-columns: 1fr; \n              gap: 16px; \n            }\n            \n            .stage-flow {\n              flex-direction: column;\n              gap: 12px;\n            }\n            \n            .stage-arrow {\n              transform: rotate(90deg);\n            }\n            \n            .action-button, .action-button-secondary {\n              padding: 14px 24px;\n              font-size: 14px;\n            }\n          }\n          \n          /* Dark mode support */\n          @media (prefers-color-scheme: dark) {\n            .email-container {\n              background: #ffffff !important;\n            }\n            \n            .content {\n              background: #ffffff !important;\n            }\n          }\n        </style>\n      </head>\n      <body>\n        <div class="email-container">\n          \n      <div class="header">\n        <h1>VAT Work Assignment</h1>\n        <div class="subtitle">You've been assigned to handle VAT work for a client</div>\n      </div>\n      \n      <div class="content">\n        <div class="assignment-card">\n          <h2 style="margin: 0 0 10px 0; color: #1a1a1a !important;">Hello Staff Bharat</h2>\n          <p style="margin: 0; font-size: 16px; color: #374151 !important;">\n            You have been assigned VAT work for <strong>MAYA101PVT LIMITED</strong> by Partner Bharat.\n            \n          </p>\n        </div>\n\n        <div class="company-info">\n          <h3>Company Details</h3>\n          <div class="info-grid">\n            <div class="info-item">\n              <div class="info-label">Company Name</div>\n              <div class="info-value">MAYA101PVT LIMITED</div>\n            </div>\n            <div class="info-item">\n              <div class="info-label">Client Code</div>\n              <div class="info-value">NZ-2</div>\n            </div>\n            \n            <div class="info-item">\n              <div class="info-label">Company Number</div>\n              <div class="info-value">14999760</div>\n            </div>\n            \n            \n          </div>\n        </div>\n\n        <div class="company-info">\n          <h3>VAT Quarter Information</h3>\n          <div class="info-grid">\n            <div class="info-item">\n              <div class="info-label">Quarter Period</div>\n              <div class="info-value">2025-04-01_to_2025-06-30</div>\n            </div>\n            <div class="info-item">\n              <div class="info-label">Quarter End Date</div>\n              <div class="info-value">30 June 2025</div>\n            </div>\n            <div class="info-item">\n              <div class="info-label">Filing Due Date</div>\n              <div class="info-value">31 July 2025</div>\n            </div>\n            <div class="info-item">\n              <div class="info-label">Current Status</div>\n              <div class="info-value">\n                <span class="status-badge status-pending">\n                  Paperwork Pending Chase\n                </span>\n              </div>\n            </div>\n          </div>\n        </div>\n\n        <div class="deadline-alert normal">\n          <h4 style="margin: 0 0 10px 0;">\n            Upcoming Deadline\n          </h4>\n          <p style="margin: 0; font-weight: 600;">\n            VAT return filing due in 23 days\n          </p>\n          \n        </div>\n\n        <div class="next-steps">\n          <h4>Next Steps</h4>\n          <ul>\n            <li>Log into the Numericalz system to review the client's details</li>\n            <li>Check the current workflow stage and any pending tasks</li>\n            <li>Contact the client if paperwork or information is needed</li>\n            <li>Update the workflow status as you progress</li>\n            <li>Ensure filing is completed before the due date</li>\n          </ul>\n        </div>\n\n        <div style="text-align: center;">\n          <a href="http://localhost:3000/dashboard/clients/vat-dt" class="action-button">\n            View VAT Deadlines Dashboard\n          </a>\n        </div>\n      </div>\n\n      <div class="footer">\n        <p class="brand">Numericalz</p>\n        <p>This is an automated notification.</p>\n        <p>© 2025 Numericalz</p>\n      </div>\n    \n        </div>\n      </body>\n      </html>\n    	VAT_ASSIGNMENT	SENT	2025-07-08 07:55:13.578	\N	\N	\N	cmcu8ft2p0000806tm5ihul5z	VAT	\N	cmcu72m8n0006826rtk6akzul	notifications@cloud9digital.in	Numericalz	\N	{"assigneeName":"Staff Bharat","companyName":"MAYA101PVT LIMITED","clientCode":"NZ-2","quarterPeriod":"2025-04-01_to_2025-06-30","assignedBy":"Partner Bharat"}
\.


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.email_templates (id, name, subject, "htmlContent", "textContent", variables, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: ltd_accounts_workflow_history; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.ltd_accounts_workflow_history (id, "ltdAccountsWorkflowId", "fromStage", "toStage", "stageChangedAt", "userId", "userName", "userEmail", "userRole", notes, "createdAt", "daysInPreviousStage") FROM stdin;
\.


--
-- Data for Name: ltd_accounts_workflows; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.ltd_accounts_workflows (id, "clientId", "filingPeriodStart", "filingPeriodEnd", "accountsDueDate", "ctDueDate", "csDueDate", "currentStage", "assignedUserId", "isCompleted", "createdAt", "updatedAt", "chaseStartedDate", "chaseStartedByUserId", "chaseStartedByUserName", "paperworkReceivedDate", "paperworkReceivedByUserId", "paperworkReceivedByUserName", "workStartedDate", "workStartedByUserId", "workStartedByUserName", "managerDiscussionDate", "managerDiscussionByUserId", "managerDiscussionByUserName", "partnerReviewDate", "partnerReviewByUserId", "partnerReviewByUserName", "reviewCompletedDate", "reviewCompletedByUserId", "reviewCompletedByUserName", "sentToClientDate", "sentToClientByUserId", "sentToClientByUserName", "clientApprovedDate", "clientApprovedByUserId", "clientApprovedByUserName", "partnerApprovedDate", "partnerApprovedByUserId", "partnerApprovedByUserName", "filedDate", "filedByUserId", "filedByUserName", "filedToCompaniesHouseDate", "filedToCompaniesHouseByUserId", "filedToCompaniesHouseByUserName", "filedToHMRCDate", "filedToHMRCByUserId", "filedToHMRCByUserName", "clientSelfFilingDate", "clientSelfFilingByUserId", "clientSelfFilingByUserName") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.notifications (id, type, title, message, "isRead", data, "userId", "createdAt") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.sessions (id, "sessionToken", "userId", expires) FROM stdin;
\.


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.settings (id, key, value, "updatedAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: user_settings; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.user_settings (id, "userId", "defaultAssigneeId", "emailNotifications", "smsNotifications", "createdAt", "updatedAt", "ltdWorkflowAutomationEnabled") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.users (id, email, name, password, role, "isActive", "lastLoginAt", "createdAt", "updatedAt", "isOtpVerified", "lastOtpSentAt", "otpAttempts", "otpCode", "otpExpiresAt") FROM stdin;
emergency_user_1751958748	vasireddybharatsai@gmail.com	Staff Bharat	$2a$12$/4fmT8TuFFrckg91dgI.6.b0jttIzOPvJB/XOSrhTkCKqdPMaXd9i	STAFF	t	2025-07-08 07:13:41	2025-07-08 12:42:28.853	2025-07-08 07:16:34.351	t	2025-07-08 07:13:09.168	0	\N	\N
cmcu72m8n0006826rtk6akzul	bharat@cloud9digital.in	Partner Bharat	$2a$12$Pp1iA49.Pyf8FcaZlMD6iOcLPEztMhxrPzTpCWRSqjAVUwlsgIHtq	PARTNER	t	2025-07-08 07:56:12	2025-07-08 07:14:22.871	2025-07-08 07:56:12.181	t	2025-07-08 07:55:52.871	0	\N	\N
\.


--
-- Data for Name: vat_quarters; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.vat_quarters (id, "clientId", "quarterPeriod", "quarterStartDate", "quarterEndDate", "filingDueDate", "quarterGroup", "currentStage", "isCompleted", "assignedUserId", "chaseStartedDate", "chaseStartedByUserId", "chaseStartedByUserName", "paperworkReceivedDate", "paperworkReceivedByUserId", "paperworkReceivedByUserName", "workStartedDate", "workStartedByUserId", "workStartedByUserName", "workFinishedDate", "workFinishedByUserId", "workFinishedByUserName", "sentToClientDate", "sentToClientByUserId", "sentToClientByUserName", "clientApprovedDate", "clientApprovedByUserId", "clientApprovedByUserName", "filedToHMRCDate", "filedToHMRCByUserId", "filedToHMRCByUserName", "createdAt", "updatedAt") FROM stdin;
cmcu74d7t000j826rbkj0nsrj	cmcu7412p000f826rf1izc2f6	2025-04-01_to_2025-06-30	2025-04-01 00:00:00	2025-06-30 00:00:00	2025-07-31 00:00:00	3_6_9_12	PAPERWORK_PENDING_CHASE	f	emergency_user_1751958748	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-07-08 07:15:44.489	2025-07-08 07:20:23.281
cmcu8gccn0004806tcbzf5afn	cmcu8ft2p0000806tm5ihul5z	2025-04-01_to_2025-06-30	2025-04-01 00:00:00	2025-06-30 00:00:00	2025-07-31 00:00:00	3_6_9_12	PAPERWORK_PENDING_CHASE	f	emergency_user_1751958748	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	2025-07-08 07:53:02.856	2025-07-08 07:55:11.115
\.


--
-- Data for Name: vat_workflow_history; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.vat_workflow_history (id, "vatQuarterId", "fromStage", "toStage", "stageChangedAt", "daysInPreviousStage", "userId", "userName", "userEmail", "userRole", notes, "createdAt") FROM stdin;
cmcu74d9n000l826r1mxzflw0	cmcu74d7t000j826rbkj0nsrj	\N	PAPERWORK_PENDING_CHASE	2025-07-08 07:15:44.554	\N	cmcu72m8n0006826rtk6akzul	Partner Bharat	bharat@cloud9digital.in	PARTNER	VAT quarter automatically created for current period - quarter ended, ready for chase	2025-07-08 07:15:44.555
cmcu7acc8000v826rz9y90y6n	cmcu74d7t000j826rbkj0nsrj	PAPERWORK_PENDING_CHASE	PAPERWORK_PENDING_CHASE	2025-07-08 07:20:23.287	\N	cmcu72m8n0006826rtk6akzul	Partner Bharat	bharat@cloud9digital.in	PARTNER	Assigned VAT quarter to Staff Bharat from Unassigned VAT widget	2025-07-08 07:20:23.288
cmcu8gccu0006806tdzeredbt	cmcu8gccn0004806tcbzf5afn	\N	PAPERWORK_PENDING_CHASE	2025-07-08 07:53:02.862	\N	cmcu72m8n0006826rtk6akzul	Partner Bharat	bharat@cloud9digital.in	PARTNER	VAT quarter automatically created for current period - quarter ended, ready for chase	2025-07-08 07:53:02.862
cmcu8j3l90008806tuf6vxld5	cmcu8gccn0004806tcbzf5afn	PAPERWORK_PENDING_CHASE	PAPERWORK_PENDING_CHASE	2025-07-08 07:55:11.468	\N	cmcu72m8n0006826rtk6akzul	Partner Bharat	bharat@cloud9digital.in	PARTNER	Assigned VAT quarter to Staff Bharat from Unassigned VAT widget	2025-07-08 07:55:11.469
\.


--
-- Data for Name: verificationtokens; Type: TABLE DATA; Schema: public; Owner: numericalz_user
--

COPY public.verificationtokens (identifier, token, expires) FROM stdin;
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: communications communications_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: ltd_accounts_workflow_history ltd_accounts_workflow_history_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.ltd_accounts_workflow_history
    ADD CONSTRAINT ltd_accounts_workflow_history_pkey PRIMARY KEY (id);


--
-- Name: ltd_accounts_workflows ltd_accounts_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.ltd_accounts_workflows
    ADD CONSTRAINT ltd_accounts_workflows_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vat_quarters vat_quarters_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.vat_quarters
    ADD CONSTRAINT vat_quarters_pkey PRIMARY KEY (id);


--
-- Name: vat_workflow_history vat_workflow_history_pkey; Type: CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.vat_workflow_history
    ADD CONSTRAINT vat_workflow_history_pkey PRIMARY KEY (id);


--
-- Name: accounts_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON public.accounts USING btree (provider, "providerAccountId");


--
-- Name: activity_logs_action_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX activity_logs_action_idx ON public.activity_logs USING btree (action);


--
-- Name: activity_logs_clientId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "activity_logs_clientId_idx" ON public.activity_logs USING btree ("clientId");


--
-- Name: activity_logs_timestamp_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX activity_logs_timestamp_idx ON public.activity_logs USING btree ("timestamp");


--
-- Name: activity_logs_userId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "activity_logs_userId_idx" ON public.activity_logs USING btree ("userId");


--
-- Name: clients_assignedUserId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_assignedUserId_idx" ON public.clients USING btree ("assignedUserId");


--
-- Name: clients_chaseTeamUserIds_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_chaseTeamUserIds_idx" ON public.clients USING gin ("chaseTeamUserIds");


--
-- Name: clients_clientCode_key; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE UNIQUE INDEX "clients_clientCode_key" ON public.clients USING btree ("clientCode");


--
-- Name: clients_companyNumber_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_companyNumber_idx" ON public.clients USING btree ("companyNumber");


--
-- Name: clients_companyNumber_key; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE UNIQUE INDEX "clients_companyNumber_key" ON public.clients USING btree ("companyNumber");


--
-- Name: clients_companyStatus_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_companyStatus_idx" ON public.clients USING btree ("companyStatus");


--
-- Name: clients_companyType_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_companyType_idx" ON public.clients USING btree ("companyType");


--
-- Name: clients_corporationTaxPeriodEnd_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_corporationTaxPeriodEnd_idx" ON public.clients USING btree ("corporationTaxPeriodEnd");


--
-- Name: clients_corporationTaxStatus_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_corporationTaxStatus_idx" ON public.clients USING btree ("corporationTaxStatus");


--
-- Name: clients_ctDueSource_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_ctDueSource_idx" ON public.clients USING btree ("ctDueSource");


--
-- Name: clients_isActive_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_isActive_idx" ON public.clients USING btree ("isActive");


--
-- Name: clients_ltdCompanyAssignedUserId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_ltdCompanyAssignedUserId_idx" ON public.clients USING btree ("ltdCompanyAssignedUserId");


--
-- Name: clients_nextAccountsDue_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_nextAccountsDue_idx" ON public.clients USING btree ("nextAccountsDue");


--
-- Name: clients_nextConfirmationDue_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_nextConfirmationDue_idx" ON public.clients USING btree ("nextConfirmationDue");


--
-- Name: clients_nextCorporationTaxDue_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_nextCorporationTaxDue_idx" ON public.clients USING btree ("nextCorporationTaxDue");


--
-- Name: clients_nonLtdCompanyAssignedUserId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_nonLtdCompanyAssignedUserId_idx" ON public.clients USING btree ("nonLtdCompanyAssignedUserId");


--
-- Name: clients_vatAssignedUserId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "clients_vatAssignedUserId_idx" ON public.clients USING btree ("vatAssignedUserId");


--
-- Name: communications_clientId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "communications_clientId_idx" ON public.communications USING btree ("clientId");


--
-- Name: communications_sentAt_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "communications_sentAt_idx" ON public.communications USING btree ("sentAt");


--
-- Name: communications_sentByUserId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "communications_sentByUserId_idx" ON public.communications USING btree ("sentByUserId");


--
-- Name: communications_type_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX communications_type_idx ON public.communications USING btree (type);


--
-- Name: email_logs_clientId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "email_logs_clientId_idx" ON public.email_logs USING btree ("clientId");


--
-- Name: email_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "email_logs_createdAt_idx" ON public.email_logs USING btree ("createdAt");


--
-- Name: email_logs_emailType_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "email_logs_emailType_idx" ON public.email_logs USING btree ("emailType");


--
-- Name: email_logs_recipientEmail_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "email_logs_recipientEmail_idx" ON public.email_logs USING btree ("recipientEmail");


--
-- Name: email_logs_sentAt_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "email_logs_sentAt_idx" ON public.email_logs USING btree ("sentAt");


--
-- Name: email_logs_status_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX email_logs_status_idx ON public.email_logs USING btree (status);


--
-- Name: email_logs_templateId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "email_logs_templateId_idx" ON public.email_logs USING btree ("templateId");


--
-- Name: email_logs_triggeredBy_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "email_logs_triggeredBy_idx" ON public.email_logs USING btree ("triggeredBy");


--
-- Name: email_templates_name_key; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE UNIQUE INDEX email_templates_name_key ON public.email_templates USING btree (name);


--
-- Name: ltd_accounts_workflow_history_ltdAccountsWorkflowId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "ltd_accounts_workflow_history_ltdAccountsWorkflowId_idx" ON public.ltd_accounts_workflow_history USING btree ("ltdAccountsWorkflowId");


--
-- Name: ltd_accounts_workflows_assignedUserId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "ltd_accounts_workflows_assignedUserId_idx" ON public.ltd_accounts_workflows USING btree ("assignedUserId");


--
-- Name: ltd_accounts_workflows_clientId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "ltd_accounts_workflows_clientId_idx" ON public.ltd_accounts_workflows USING btree ("clientId");


--
-- Name: ltd_accounts_workflows_currentStage_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "ltd_accounts_workflows_currentStage_idx" ON public.ltd_accounts_workflows USING btree ("currentStage");


--
-- Name: ltd_accounts_workflows_filingPeriodEnd_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "ltd_accounts_workflows_filingPeriodEnd_idx" ON public.ltd_accounts_workflows USING btree ("filingPeriodEnd");


--
-- Name: notifications_isRead_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "notifications_isRead_idx" ON public.notifications USING btree ("isRead");


--
-- Name: notifications_type_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX notifications_type_idx ON public.notifications USING btree (type);


--
-- Name: notifications_userId_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "notifications_userId_idx" ON public.notifications USING btree ("userId");


--
-- Name: sessions_sessionToken_key; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE UNIQUE INDEX "sessions_sessionToken_key" ON public.sessions USING btree ("sessionToken");


--
-- Name: settings_key_key; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE UNIQUE INDEX settings_key_key ON public.settings USING btree (key);


--
-- Name: user_settings_userId_key; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE UNIQUE INDEX "user_settings_userId_key" ON public.user_settings USING btree ("userId");


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_isActive_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "users_isActive_idx" ON public.users USING btree ("isActive");


--
-- Name: users_otpCode_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "users_otpCode_idx" ON public.users USING btree ("otpCode");


--
-- Name: users_otpExpiresAt_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX "users_otpExpiresAt_idx" ON public.users USING btree ("otpExpiresAt");


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- Name: vat_quarters_clientId_quarterPeriod_key; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE UNIQUE INDEX "vat_quarters_clientId_quarterPeriod_key" ON public.vat_quarters USING btree ("clientId", "quarterPeriod");


--
-- Name: verificationtokens_identifier_token_key; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE UNIQUE INDEX verificationtokens_identifier_token_key ON public.verificationtokens USING btree (identifier, token);


--
-- Name: verificationtokens_token_key; Type: INDEX; Schema: public; Owner: numericalz_user
--

CREATE UNIQUE INDEX verificationtokens_token_key ON public.verificationtokens USING btree (token);


--
-- Name: accounts accounts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT "activity_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clients clients_assignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clients clients_ltdCompanyAssignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_ltdCompanyAssignedUserId_fkey" FOREIGN KEY ("ltdCompanyAssignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clients clients_nonLtdCompanyAssignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_nonLtdCompanyAssignedUserId_fkey" FOREIGN KEY ("nonLtdCompanyAssignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clients clients_vatAssignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_vatAssignedUserId_fkey" FOREIGN KEY ("vatAssignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: communications communications_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT "communications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: communications communications_sentByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT "communications_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: email_logs email_logs_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT "email_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: email_logs email_logs_templateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT "email_logs_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES public.email_templates(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: email_logs email_logs_triggeredBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT "email_logs_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ltd_accounts_workflow_history ltd_accounts_workflow_history_ltdAccountsWorkflowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.ltd_accounts_workflow_history
    ADD CONSTRAINT "ltd_accounts_workflow_history_ltdAccountsWorkflowId_fkey" FOREIGN KEY ("ltdAccountsWorkflowId") REFERENCES public.ltd_accounts_workflows(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ltd_accounts_workflow_history ltd_accounts_workflow_history_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.ltd_accounts_workflow_history
    ADD CONSTRAINT "ltd_accounts_workflow_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ltd_accounts_workflows ltd_accounts_workflows_assignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.ltd_accounts_workflows
    ADD CONSTRAINT "ltd_accounts_workflows_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ltd_accounts_workflows ltd_accounts_workflows_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.ltd_accounts_workflows
    ADD CONSTRAINT "ltd_accounts_workflows_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_settings user_settings_defaultAssigneeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT "user_settings_defaultAssigneeId_fkey" FOREIGN KEY ("defaultAssigneeId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_settings user_settings_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vat_quarters vat_quarters_assignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.vat_quarters
    ADD CONSTRAINT "vat_quarters_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vat_quarters vat_quarters_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.vat_quarters
    ADD CONSTRAINT "vat_quarters_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vat_workflow_history vat_workflow_history_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.vat_workflow_history
    ADD CONSTRAINT "vat_workflow_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vat_workflow_history vat_workflow_history_vatQuarterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: numericalz_user
--

ALTER TABLE ONLY public.vat_workflow_history
    ADD CONSTRAINT "vat_workflow_history_vatQuarterId_fkey" FOREIGN KEY ("vatQuarterId") REFERENCES public.vat_quarters(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

