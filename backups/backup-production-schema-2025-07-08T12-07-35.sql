--
-- PostgreSQL database dump
--

-- Dumped from database version 16.8 (Debian 16.8-1.pgdg120+1)
-- Dumped by pg_dump version 16.9 (Homebrew)

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
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: EmailStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EmailStatus" AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'FAILED',
    'BOUNCED'
);


ALTER TYPE public."EmailStatus" OWNER TO postgres;

--
-- Name: LtdAccountsWorkflowStage; Type: TYPE; Schema: public; Owner: postgres
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


ALTER TYPE public."LtdAccountsWorkflowStage" OWNER TO postgres;

--
-- Name: VATWorkflowStage; Type: TYPE; Schema: public; Owner: postgres
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


ALTER TYPE public."VATWorkflowStage" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.accounts OWNER TO postgres;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id text NOT NULL,
    action text NOT NULL,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" text,
    "clientId" text,
    details text
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: communications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.communications OWNER TO postgres;

--
-- Name: email_logs; Type: TABLE; Schema: public; Owner: postgres
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
    "fromName" text DEFAULT 'Numericalz'::text
);


ALTER TABLE public.email_logs OWNER TO postgres;

--
-- Name: email_templates; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.email_templates OWNER TO postgres;

--
-- Name: ltd_accounts_workflow_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.ltd_accounts_workflow_history OWNER TO postgres;

--
-- Name: ltd_accounts_workflows; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.ltd_accounts_workflows OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.user_settings OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: vat_quarters; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.vat_quarters OWNER TO postgres;

--
-- Name: vat_workflow_history; Type: TABLE; Schema: public; Owner: postgres
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


ALTER TABLE public.vat_workflow_history OWNER TO postgres;

--
-- Name: verificationtokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.verificationtokens (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.verificationtokens OWNER TO postgres;

--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: communications communications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT communications_pkey PRIMARY KEY (id);


--
-- Name: email_logs email_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT email_logs_pkey PRIMARY KEY (id);


--
-- Name: email_templates email_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_templates
    ADD CONSTRAINT email_templates_pkey PRIMARY KEY (id);


--
-- Name: ltd_accounts_workflow_history ltd_accounts_workflow_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ltd_accounts_workflow_history
    ADD CONSTRAINT ltd_accounts_workflow_history_pkey PRIMARY KEY (id);


--
-- Name: ltd_accounts_workflows ltd_accounts_workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ltd_accounts_workflows
    ADD CONSTRAINT ltd_accounts_workflows_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vat_quarters vat_quarters_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vat_quarters
    ADD CONSTRAINT vat_quarters_pkey PRIMARY KEY (id);


--
-- Name: vat_workflow_history vat_workflow_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vat_workflow_history
    ADD CONSTRAINT vat_workflow_history_pkey PRIMARY KEY (id);


--
-- Name: accounts_provider_providerAccountId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON public.accounts USING btree (provider, "providerAccountId");


--
-- Name: activity_logs_action_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activity_logs_action_idx ON public.activity_logs USING btree (action);


--
-- Name: activity_logs_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_logs_clientId_idx" ON public.activity_logs USING btree ("clientId");


--
-- Name: activity_logs_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX activity_logs_timestamp_idx ON public.activity_logs USING btree ("timestamp");


--
-- Name: activity_logs_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "activity_logs_userId_idx" ON public.activity_logs USING btree ("userId");


--
-- Name: clients_assignedUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_assignedUserId_idx" ON public.clients USING btree ("assignedUserId");


--
-- Name: clients_chaseTeamUserIds_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_chaseTeamUserIds_idx" ON public.clients USING gin ("chaseTeamUserIds");


--
-- Name: clients_clientCode_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "clients_clientCode_key" ON public.clients USING btree ("clientCode");


--
-- Name: clients_companyNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_companyNumber_idx" ON public.clients USING btree ("companyNumber");


--
-- Name: clients_companyNumber_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "clients_companyNumber_key" ON public.clients USING btree ("companyNumber");


--
-- Name: clients_companyStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_companyStatus_idx" ON public.clients USING btree ("companyStatus");


--
-- Name: clients_companyType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_companyType_idx" ON public.clients USING btree ("companyType");


--
-- Name: clients_corporationTaxPeriodEnd_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_corporationTaxPeriodEnd_idx" ON public.clients USING btree ("corporationTaxPeriodEnd");


--
-- Name: clients_corporationTaxStatus_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_corporationTaxStatus_idx" ON public.clients USING btree ("corporationTaxStatus");


--
-- Name: clients_ctDueSource_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_ctDueSource_idx" ON public.clients USING btree ("ctDueSource");


--
-- Name: clients_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_isActive_idx" ON public.clients USING btree ("isActive");


--
-- Name: clients_ltdCompanyAssignedUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_ltdCompanyAssignedUserId_idx" ON public.clients USING btree ("ltdCompanyAssignedUserId");


--
-- Name: clients_nextAccountsDue_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_nextAccountsDue_idx" ON public.clients USING btree ("nextAccountsDue");


--
-- Name: clients_nextConfirmationDue_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_nextConfirmationDue_idx" ON public.clients USING btree ("nextConfirmationDue");


--
-- Name: clients_nextCorporationTaxDue_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_nextCorporationTaxDue_idx" ON public.clients USING btree ("nextCorporationTaxDue");


--
-- Name: clients_nonLtdCompanyAssignedUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_nonLtdCompanyAssignedUserId_idx" ON public.clients USING btree ("nonLtdCompanyAssignedUserId");


--
-- Name: clients_vatAssignedUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "clients_vatAssignedUserId_idx" ON public.clients USING btree ("vatAssignedUserId");


--
-- Name: communications_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "communications_clientId_idx" ON public.communications USING btree ("clientId");


--
-- Name: communications_sentAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "communications_sentAt_idx" ON public.communications USING btree ("sentAt");


--
-- Name: communications_sentByUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "communications_sentByUserId_idx" ON public.communications USING btree ("sentByUserId");


--
-- Name: communications_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX communications_type_idx ON public.communications USING btree (type);


--
-- Name: email_logs_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "email_logs_clientId_idx" ON public.email_logs USING btree ("clientId");


--
-- Name: email_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "email_logs_createdAt_idx" ON public.email_logs USING btree ("createdAt");


--
-- Name: email_logs_emailType_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "email_logs_emailType_idx" ON public.email_logs USING btree ("emailType");


--
-- Name: email_logs_recipientEmail_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "email_logs_recipientEmail_idx" ON public.email_logs USING btree ("recipientEmail");


--
-- Name: email_logs_sentAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "email_logs_sentAt_idx" ON public.email_logs USING btree ("sentAt");


--
-- Name: email_logs_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX email_logs_status_idx ON public.email_logs USING btree (status);


--
-- Name: email_logs_triggeredBy_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "email_logs_triggeredBy_idx" ON public.email_logs USING btree ("triggeredBy");


--
-- Name: email_templates_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX email_templates_name_key ON public.email_templates USING btree (name);


--
-- Name: ltd_accounts_workflow_history_ltdAccountsWorkflowId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ltd_accounts_workflow_history_ltdAccountsWorkflowId_idx" ON public.ltd_accounts_workflow_history USING btree ("ltdAccountsWorkflowId");


--
-- Name: ltd_accounts_workflows_assignedUserId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ltd_accounts_workflows_assignedUserId_idx" ON public.ltd_accounts_workflows USING btree ("assignedUserId");


--
-- Name: ltd_accounts_workflows_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ltd_accounts_workflows_clientId_idx" ON public.ltd_accounts_workflows USING btree ("clientId");


--
-- Name: ltd_accounts_workflows_currentStage_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ltd_accounts_workflows_currentStage_idx" ON public.ltd_accounts_workflows USING btree ("currentStage");


--
-- Name: ltd_accounts_workflows_filingPeriodEnd_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ltd_accounts_workflows_filingPeriodEnd_idx" ON public.ltd_accounts_workflows USING btree ("filingPeriodEnd");


--
-- Name: notifications_isRead_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "notifications_isRead_idx" ON public.notifications USING btree ("isRead");


--
-- Name: notifications_type_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX notifications_type_idx ON public.notifications USING btree (type);


--
-- Name: notifications_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "notifications_userId_idx" ON public.notifications USING btree ("userId");


--
-- Name: sessions_sessionToken_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "sessions_sessionToken_key" ON public.sessions USING btree ("sessionToken");


--
-- Name: settings_key_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX settings_key_key ON public.settings USING btree (key);


--
-- Name: user_settings_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "user_settings_userId_key" ON public.user_settings USING btree ("userId");


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_isActive_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "users_isActive_idx" ON public.users USING btree ("isActive");


--
-- Name: users_otpCode_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "users_otpCode_idx" ON public.users USING btree ("otpCode");


--
-- Name: users_otpExpiresAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "users_otpExpiresAt_idx" ON public.users USING btree ("otpExpiresAt");


--
-- Name: users_role_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX users_role_idx ON public.users USING btree (role);


--
-- Name: vat_quarters_clientId_quarterPeriod_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "vat_quarters_clientId_quarterPeriod_key" ON public.vat_quarters USING btree ("clientId", "quarterPeriod");


--
-- Name: verificationtokens_identifier_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX verificationtokens_identifier_token_key ON public.verificationtokens USING btree (identifier, token);


--
-- Name: verificationtokens_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX verificationtokens_token_key ON public.verificationtokens USING btree (token);


--
-- Name: accounts accounts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT "activity_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: activity_logs activity_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clients clients_assignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clients clients_ltdCompanyAssignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_ltdCompanyAssignedUserId_fkey" FOREIGN KEY ("ltdCompanyAssignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clients clients_nonLtdCompanyAssignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_nonLtdCompanyAssignedUserId_fkey" FOREIGN KEY ("nonLtdCompanyAssignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: clients clients_vatAssignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT "clients_vatAssignedUserId_fkey" FOREIGN KEY ("vatAssignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: communications communications_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT "communications_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: communications communications_sentByUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.communications
    ADD CONSTRAINT "communications_sentByUserId_fkey" FOREIGN KEY ("sentByUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: email_logs email_logs_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT "email_logs_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: email_logs email_logs_triggeredBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.email_logs
    ADD CONSTRAINT "email_logs_triggeredBy_fkey" FOREIGN KEY ("triggeredBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ltd_accounts_workflow_history ltd_accounts_workflow_history_ltdAccountsWorkflowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ltd_accounts_workflow_history
    ADD CONSTRAINT "ltd_accounts_workflow_history_ltdAccountsWorkflowId_fkey" FOREIGN KEY ("ltdAccountsWorkflowId") REFERENCES public.ltd_accounts_workflows(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ltd_accounts_workflow_history ltd_accounts_workflow_history_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ltd_accounts_workflow_history
    ADD CONSTRAINT "ltd_accounts_workflow_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ltd_accounts_workflows ltd_accounts_workflows_assignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ltd_accounts_workflows
    ADD CONSTRAINT "ltd_accounts_workflows_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ltd_accounts_workflows ltd_accounts_workflows_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.ltd_accounts_workflows
    ADD CONSTRAINT "ltd_accounts_workflows_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: sessions sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_settings user_settings_defaultAssigneeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT "user_settings_defaultAssigneeId_fkey" FOREIGN KEY ("defaultAssigneeId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: user_settings user_settings_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vat_quarters vat_quarters_assignedUserId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vat_quarters
    ADD CONSTRAINT "vat_quarters_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vat_quarters vat_quarters_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vat_quarters
    ADD CONSTRAINT "vat_quarters_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public.clients(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: vat_workflow_history vat_workflow_history_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vat_workflow_history
    ADD CONSTRAINT "vat_workflow_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: vat_workflow_history vat_workflow_history_vatQuarterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.vat_workflow_history
    ADD CONSTRAINT "vat_workflow_history_vatQuarterId_fkey" FOREIGN KEY ("vatQuarterId") REFERENCES public.vat_quarters(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

