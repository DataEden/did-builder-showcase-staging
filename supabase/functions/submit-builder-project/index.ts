// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type BuilderProjectPayload = {
  first_name?: string;
  last_name?: string;
  submitter_email?: string;
  github_username?: string;
  repo_url?: string;
  project_title?: string;
  project_category?: string;
  project_description?: string;
  project_tags?: string[] | string;
  live_url?: string;
  readme_url?: string;
  owns_or_has_permission?: boolean;
  wants_public_showcase?: boolean;

  // Honeypot field. Real users should never fill this.
  website?: string;
};

type SupabaseAdminClient = SupabaseClient<any>;
type DuplicateCheckResult = {
  isDuplicate: boolean;
  reason?: string;
};

const allowedOrigins = new Set([
  "http://localhost:4000",
  "http://127.0.0.1:4000",
  "https://datainsidedata.com",
  "https://www.datainsidedata.com",
  "https://dataeden.github.io",
  // later, if used:
  // "https://staging.datainsidedata.com",
]);

const allowedCategories = new Set([
  "AI & Decision Systems",
  "Data Analytics",
  "Machine Learning",
  "Cloud / DevOps",
  "Cybersecurity / IT",
  "Web / Software Development",
  "Other",
]);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";

  const allowedOrigin = allowedOrigins.has(origin)
    ? origin
    : "http://localhost:4000";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
}

function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: getCorsHeaders(req),
  });
}

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanLowerString(value: unknown): string {
  return cleanString(value).toLowerCase();
}

function cleanOptionalString(value: unknown): string | null {
  const cleaned = cleanString(value);
  return cleaned.length > 0 ? cleaned : null;
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((tag) => String(tag).trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 20);
  }

  return [];
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isValidGitHubRepoUrl(value: string): boolean {
  try {
    const url = new URL(value);

    const isGithubHost =
      url.hostname === "github.com" || url.hostname === "www.github.com";

    const parts = url.pathname
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);

    // Require at least /owner/repo.
    return isGithubHost && parts.length >= 2;
  } catch {
    return false;
  }
}

function isValidRawReadmeUrl(value: string): boolean {
  if (!value) return true;

  try {
    const url = new URL(value);

    return (
      url.protocol === "https:" &&
      url.hostname === "raw.githubusercontent.com" &&
      url.pathname.toLowerCase().endsWith("readme.md")
    );
  } catch {
    return false;
  }
}

function validatePayload(payload: BuilderProjectPayload): string[] {
  const errors: string[] = [];

  const firstName = cleanString(payload.first_name);
  const lastName = cleanString(payload.last_name);
  const email = cleanLowerString(payload.submitter_email);
  const githubUsername = cleanString(payload.github_username);
  const repoUrl = cleanString(payload.repo_url);
  const projectTitle = cleanString(payload.project_title);
  const projectCategory = cleanString(payload.project_category);
  const projectDescription = cleanString(payload.project_description);
  const projectTags = normalizeTags(payload.project_tags);
  const liveUrl = cleanString(payload.live_url);
  const readmeUrl = cleanString(payload.readme_url);

  // Honeypot: real users should never fill this.
  if (cleanString(payload.website)) {
    errors.push("Invalid submission.");
  }

  // Required fields
  if (!firstName) {
    errors.push("First name is required.");
  }

  if (!lastName) {
    errors.push("Last name is required.");
  }

  if (!email) {
    errors.push("Email is required.");
  } else if (!isValidEmail(email)) {
    errors.push("Please provide a valid email address.");
  }

  if (!githubUsername) {
  errors.push("GitHub username is required.");
  }

  if (!repoUrl) {
    errors.push("GitHub repository URL is required.");
  } else if (!isValidGitHubRepoUrl(repoUrl)) {
    errors.push("Repository URL must be a valid GitHub repository URL.");
  }

  if (!projectTitle) {
    errors.push("Project title is required.");
  }

  if (!projectCategory) {
    errors.push("Project category is required.");
  } else if (!allowedCategories.has(projectCategory)) {
    errors.push("Project category is not recognized.");
  }

  if (!projectDescription) {
    errors.push("Project description is required.");
  }

  if (projectTags.length === 0) {
    errors.push("At least one tag or tool is required.");
  }

  // Required acknowledgements
  if (payload.owns_or_has_permission !== true) {
    errors.push(
      "You must confirm that you own, contributed to, or have permission to submit this project."
    );
  }

  if (payload.wants_public_showcase !== true) {
    errors.push(
      "You must acknowledge that approved projects may be displayed publicly on DataInsideData™."
    );
  }

  // Optional URL checks
  if (liveUrl && !isHttpUrl(liveUrl)) {
    errors.push("Live demo URL must start with http:// or https://.");
  }

  
  if (!readmeUrl) {
  errors.push("Raw README URL is required.");
} else if (!isValidRawReadmeUrl(readmeUrl)) {
  errors.push(
    "README URL must be a raw.githubusercontent.com URL ending in README.md."
  );
}

  // Length checks
  if (firstName.length > 80) {
    errors.push("First name is too long.");
  }

  if (lastName.length > 80) {
    errors.push("Last name is too long.");
  }

  if (email.length > 255) {
    errors.push("Email is too long.");
  }

  if (githubUsername.length > 80) {
    errors.push("GitHub username is too long.");
  }

  if (repoUrl.length > 500) {
    errors.push("Repository URL is too long.");
  }

  if (projectTitle.length > 160) {
    errors.push("Project title is too long.");
  }

  if (projectCategory.length > 120) {
    errors.push("Project category is too long.");
  }

  if (projectDescription.length > 2000) {
    errors.push("Project description is too long.");
  }

  if (liveUrl.length > 500) {
    errors.push("Live demo URL is too long.");
  }

  if (readmeUrl.length > 500) {
    errors.push("README URL is too long.");
  }

  if (projectTags.length > 20) {
    errors.push("Please provide no more than 20 tags/tools.");
  }

  return errors;
}

function getClientIp(req: Request): string {
  const cfConnectingIp = req.headers.get("cf-connecting-ip");
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const xRealIp = req.headers.get("x-real-ip");

  if (cfConnectingIp) return cfConnectingIp.trim();

  if (xForwardedFor) {
    return xForwardedFor.split(",")[0].trim();
  }

  if (xRealIp) return xRealIp.trim();

  return "";
}

async function sha256Hex(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getClientIpHash(req: Request): Promise<string | null> {
  const ip = getClientIp(req);

  if (!ip) return null;

  const salt = Deno.env.get("DID_IP_HASH_SALT");

  if (!salt) {
    console.warn("DID_IP_HASH_SALT is not set. Skipping IP hash.");
    return null;
  }

  return await sha256Hex(`${salt}:${ip}`);
}

async function checkDuplicateSubmission(
  supabaseAdmin: SupabaseAdminClient,
  payload: BuilderProjectPayload
): Promise<DuplicateCheckResult> {
  const activeStatuses = [
    "submitted",
    "reviewing",
    "approved",
    "published",
    "needs_changes",
  ];

  const email = cleanLowerString(payload.submitter_email);
  const repoUrl = cleanString(payload.repo_url);
  const projectTitle = cleanString(payload.project_title);
  const readmeUrl = cleanString(payload.readme_url);

  // Strongest project identity:
  // If a raw README URL is provided and already exists in an active workflow,
  // treat it as the same project evidence and block the duplicate.
  if (readmeUrl) {
    const { data, error } = await supabaseAdmin
      .from("builder_project_submissions")
      .select("id, status, project_title, created_at")
      .eq("readme_url", readmeUrl)
      .in("status", activeStatuses)
      .limit(1);

    if (error) {
      console.error(
        "Duplicate README check error:",
        JSON.stringify(error, null, 2)
      );
    }

    if (data && data.length > 0) {
      return {
        isDuplicate: true,
        reason:
          "A submission using this README URL is already in the review or publishing workflow. Please use a different project README URL or review the existing submission.",
      };
    }
  }

  // Recent exact duplicate fallback:
  // Same email + same repo URL + same project title within 10 minutes.
  // This still allows productive builders to submit multiple different projects.
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  if (email && repoUrl && projectTitle) {
    const { data, error } = await supabaseAdmin
      .from("builder_project_submissions")
      .select("id, status, created_at")
      .eq("submitter_email", email)
      .eq("repo_url", repoUrl)
      .eq("project_title", projectTitle)
      .gte("created_at", since)
      .limit(1);

    if (error) {
      console.error(
        "Duplicate exact submission check error:",
        JSON.stringify(error, null, 2)
      );
    }

    if (data && data.length > 0) {
      return {
        isDuplicate: true,
        reason:
          "A similar submission was received recently. Please wait a few minutes before submitting the same project again.",
      };
    }
  }

  return { isDuplicate: false };
}

type BuilderEventPayload = {
  submissionId?: string | null;
  builderProjectId?: string | null;
  eventType: string;
  eventMessage?: string | null;
  oldStatus?: string | null;
  newStatus?: string | null;
  metadata?: Record<string, unknown>;
  createdBy?: string;
};

async function logBuilderSubmissionEvent(
  supabaseAdmin: SupabaseAdminClient,
  event: BuilderEventPayload
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("builder_submission_events")
    .insert({
      submission_id: event.submissionId ?? null,
      builder_project_id: event.builderProjectId ?? null,
      event_type: event.eventType,
      event_message: event.eventMessage ?? null,
      old_status: event.oldStatus ?? null,
      new_status: event.newStatus ?? null,
      metadata: event.metadata ?? {},
      created_by: event.createdBy ?? "edge_function",
    });

  if (error) {
    console.error(
      "Builder submission event log error:",
      JSON.stringify(error, null, 2)
    );
  }
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: getCorsHeaders(req),
    });
  }

  // Only allow POST submissions.
  if (req.method !== "POST") {
    return jsonResponse(req, { error: "Method not allowed." }, 405);
  }

  // Public form key check.
  // This is not a secret like the service role key, but it helps reject
  // requests that are not coming through the intended form path.
  const expectedPublicKey = Deno.env.get("DID_PUBLIC_FORM_KEY");
  const requestApiKey = req.headers.get("apikey");

  if (!expectedPublicKey) {
    return jsonResponse(
      req,
      { error: "Server configuration error: missing public form key." },
      500
    );
  }

  if (requestApiKey !== expectedPublicKey) {
    return jsonResponse(req, { error: "Unauthorized request." }, 401);
  }

  let payload: BuilderProjectPayload;

  try {
    payload = await req.json();
  } catch {
    return jsonResponse(req, { error: "Invalid JSON payload." }, 400);
  }

  const validationErrors = validatePayload(payload);

  if (validationErrors.length > 0) {
    return jsonResponse(
      req,
      {
        error: "Submission validation failed.",
        errors: validationErrors,
      },
      400
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const writeKey = Deno.env.get("DID_SUPABASE_WRITE_KEY");

  if (!supabaseUrl || !writeKey) {
    return jsonResponse(
      req,
      { error: "Server configuration error." },
      500
    );
  }

  const supabaseAdmin = createClient<any>(supabaseUrl, writeKey);

  const clientIpHash = await getClientIpHash(req);

  const duplicateCheck = await checkDuplicateSubmission(
    supabaseAdmin,
    payload
  );

  if (duplicateCheck.isDuplicate) {
    return jsonResponse(
      req,
      {
        error: duplicateCheck.reason || "Duplicate submission detected.",
      },
      409
    );
  }

  const submissionRow = {
    first_name: cleanString(payload.first_name),
    last_name: cleanString(payload.last_name),
    submitter_email: cleanLowerString(payload.submitter_email),
    github_username: cleanOptionalString(payload.github_username),
    repo_url: cleanString(payload.repo_url),

    project_title: cleanString(payload.project_title),
    project_category: cleanString(payload.project_category),
    project_description: cleanString(payload.project_description),
    project_tags: normalizeTags(payload.project_tags),

    live_url: cleanOptionalString(payload.live_url),
    readme_url: cleanOptionalString(payload.readme_url),

    owns_or_has_permission: payload.owns_or_has_permission === true,
    wants_public_showcase: payload.wants_public_showcase === true,

    user_agent: cleanOptionalString(req.headers.get("user-agent")),
    request_origin: cleanOptionalString(req.headers.get("origin")),
    request_referer: cleanOptionalString(req.headers.get("referer")),
    client_ip_hash: clientIpHash,

    status: "submitted",
    readme_fetch_status: "pending",
  };

  const { data, error } = await supabaseAdmin
    .from("builder_project_submissions")
    .insert(submissionRow)
    .select("id, status, readme_fetch_status, created_at")
    .single();

  if (error) {
    console.error(
      "Builder project insert error:",
      JSON.stringify(error, null, 2)
    );

    return jsonResponse(
      req,
      {
        error: "Database insert failed.",
        detail: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details,
      },
      500
    );
  }

  if (!data) {
  return jsonResponse(
    req,
    {
      error: "Database insert failed.",
      detail: "No submission row was returned after insert.",
    },
    500
  );
}

  await logBuilderSubmissionEvent(supabaseAdmin, {
    submissionId: data.id,
    eventType: "submission_created",
    eventMessage: "Builder project submission created from public intake form.",
    newStatus: data.status,
    metadata: {
      project_title: submissionRow.project_title,
      repo_url: submissionRow.repo_url,
      readme_url: submissionRow.readme_url,
      project_category: submissionRow.project_category,
      readme_fetch_status: data.readme_fetch_status,
      request_origin: submissionRow.request_origin,
      request_referer: submissionRow.request_referer,
      user_agent_present: Boolean(submissionRow.user_agent),
      client_ip_hash_present: Boolean(submissionRow.client_ip_hash),
    },
    createdBy: "edge_function",
});

  return jsonResponse(
    req,
    {
      message: "Project submitted successfully.",
      submission: data,
    },
    201
  );
});