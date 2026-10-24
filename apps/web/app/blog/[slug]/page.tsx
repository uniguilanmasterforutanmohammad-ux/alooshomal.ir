import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StoppedSectionScreen } from '@/components/layout/StoppedSectionScreen';
import { BlogPostView } from '@/components/blog/BlogPostView';
import { getStoppedSections, isRouteStopped } from '@/lib/sections-server';
import {
  absoluteUrl,
  decodeSlugParam,
  metaDescription,
  SERVER_API_URL,
} from '@/lib/site';
import type { BlogPost } from '@/lib/api';

async function getPost(slug: string): Promise<BlogPost | null> {
  try {
    const response = await fetch(
      `${SERVER_API_URL}/blog/public/${encodeURIComponent(decodeSlugParam(slug))}`,
      { cache: 'no-store' },
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { data: BlogPost };
    return payload.data;
  } catch {
    return null;
  }
}

/** Server-rendered SEO metadata for a blog post. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return { title: 'مطلب بلاگ پیدا نشد', robots: { index: false, follow: false } };
  }
  const description = metaDescription(
    post.excerpt ?? post.content,
    `مطلب بلاگ «${post.title}» در شمالی کارت.`,
  );
  return {
    title: post.title,
    description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description,
      url: `/blog/${post.slug}`,
      images: post.coverImageUrl ? [absoluteUrl(post.coverImageUrl)] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const stopped = await getStoppedSections();
  if (isRouteStopped(stopped, '/blog')) {
    return (
      <>
        <Header />
        <StoppedSectionScreen title="بلاگ" />
      </>
    );
  }
  const post = await getPost(slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: metaDescription(post.excerpt ?? post.content, post.title),
    image: post.coverImageUrl ?? undefined,
    datePublished: post.publishedAt ?? post.createdAt,
    dateModified: post.updatedAt,
    author: {
      '@type': 'Organization',
      name: 'شمالی کارت',
    },
    url: absoluteUrl(`/blog/${post.slug}`),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <BlogPostView post={post} />
      <Footer />
    </>
  );
}
