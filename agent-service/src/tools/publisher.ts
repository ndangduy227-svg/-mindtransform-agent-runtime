import { checkCapability } from "./capability.js";
import { supabase } from "../db/supabase.js";

export type PublishStrategy = "cms_service_account" | "static_git_deploy" | "pause_for_operator";

export interface PublishInput {
  projectId: string;
  runId: string;
  title: string;
  slug: string;
  excerpt?: string;
  contentMd: string;
}

export interface PublishResult {
  status: "success" | "blocked";
  strategy: PublishStrategy;
  reason?: string;
  publicUrl?: string;
  receipt?: Record<string, unknown>;
}

export function selectPublishStrategy(): { strategy: PublishStrategy; reason: string } {
  const cms = checkCapability("publisher_cms");
  if (cms.available) return { strategy: "cms_service_account", reason: cms.reason };
  const git = checkCapability("publisher_static_git");
  if (git.available) return { strategy: "static_git_deploy", reason: git.reason };
  return {
    strategy: "pause_for_operator",
    reason: `no automated publisher: cms (${cms.reason}); static_git (${git.reason})`,
  };
}

export async function publish(input: PublishInput, strategy: PublishStrategy): Promise<PublishResult> {
  if (strategy !== "cms_service_account") {
    return { status: "blocked", strategy, reason: `publisher ${strategy} is not enabled` };
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("blog_posts")
    .upsert(
      {
        project_id: input.projectId,
        workflow_run_id: input.runId,
        slug: input.slug,
        title: input.title,
        excerpt: input.excerpt ?? null,
        content_md: input.contentMd,
        status: "published",
        published_at: now,
        updated_at: now,
      },
      { onConflict: "slug" },
    )
    .select("id, slug")
    .single();
  if (error || !data) {
    return { status: "blocked", strategy, reason: `CMS publish failed: ${error?.message ?? "no row returned"}` };
  }

  const baseUrl = (process.env.PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const publicUrl = `${baseUrl}/blog/${data.slug}`;
  const idempotencyKey = `publish:cms:${input.projectId}:${data.slug}`;

  const { error: resourceError } = await supabase.from("external_resources").upsert(
    {
      project_id: input.projectId,
      logical_key: `blog.${data.slug}`,
      kind: "cms_post",
      external_id: data.id,
      external_url: publicUrl,
      receipt: { strategy, publishedAt: now },
    },
    { onConflict: "project_id,logical_key" },
  );
  if (resourceError) return { status: "blocked", strategy, reason: `CMS resource registry failed: ${resourceError.message}` };

  const { error: receiptError } = await supabase.from("side_effect_receipts").upsert(
    {
      project_id: input.projectId,
      workflow_run_id: input.runId,
      node_id: "publish_strategy",
      operation: "publish.cms.upsert",
      idempotency_key: idempotencyKey,
      status: "verified",
      payload: { postId: data.id, publicUrl, slug: data.slug },
    },
    { onConflict: "workflow_run_id,idempotency_key" },
  );
  if (receiptError) return { status: "blocked", strategy, reason: `CMS receipt save failed: ${receiptError.message}` };

  return {
    status: "success",
    strategy,
    publicUrl,
    receipt: { operation: "publish.cms.upsert", idempotencyKey, postId: data.id },
  };
}
