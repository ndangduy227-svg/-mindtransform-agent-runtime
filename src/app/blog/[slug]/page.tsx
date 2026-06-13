import { notFound } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

export const dynamic = "force-dynamic"

function MarkdownArticle({ content }: { content: string }) {
  return (
    <div className="grid gap-3">
      {content.split(/\n{2,}/).map((block, index) => {
        const text = block.trim()
        if (!text) return null
        if (text.startsWith("### ")) return <h3 key={index} className="text-xl font-semibold mt-4">{text.slice(4)}</h3>
        if (text.startsWith("## ")) return <h2 key={index} className="text-2xl font-bold mt-6">{text.slice(3)}</h2>
        if (text.startsWith("# ")) return <h1 key={index} className="text-3xl font-bold">{text.slice(2)}</h1>
        if (text.split("\n").every(line => line.startsWith("- "))) {
          return (
            <ul key={index} className="list-disc pl-6 grid gap-1">
              {text.split("\n").map((line, itemIndex) => <li key={itemIndex}>{line.slice(2)}</li>)}
            </ul>
          )
        }
        return <p key={index} className="leading-7 whitespace-pre-wrap">{text}</p>
      })}
    </div>
  )
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: post } = await supabase
    .from("blog_posts")
    .select("title, excerpt, content_md, published_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle()

  if (!post) notFound()

  return (
    <main className="min-h-screen bg-[#f6f7f5] text-[#17211b]">
      <article className="max-w-[780px] mx-auto px-5 py-14">
        <Link href="/" className="text-sm text-[#4d6657] no-underline">Mindtransform</Link>
        <h1 className="text-4xl font-bold leading-tight mt-6 mb-4">{post.title}</h1>
        {post.excerpt && <p className="text-lg text-[#55625a] leading-7 mb-4">{post.excerpt}</p>}
        {post.published_at && (
          <p className="text-xs text-[#758079] mb-10">
            {new Date(post.published_at).toLocaleDateString("vi-VN")}
          </p>
        )}
        <MarkdownArticle content={post.content_md} />
      </article>
    </main>
  )
}
