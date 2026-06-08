import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { Check } from 'lucide-react'
import { loadMarkdownContent, resolveAssetUrl } from '@/lib/content/discovery'
import { extractTasks } from '@/lib/content/markdown'
import { useProgressStore } from '@/stores/progress-store'
import { useSettingsStore } from '@/stores/settings-store'
import { useGamificationStore } from '@/stores/gamification-store'
import { useResolvedTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'

function MermaidBlock({ code }: { code: string }) {
  const [svg, setSvg] = useState('')
  const resolvedTheme = useResolvedTheme()
  const id = useMemo(() => `mermaid-${Math.random().toString(36).slice(2)}`, [])

  useEffect(() => {
    let cancelled = false
    import('mermaid').then((mermaid) => {
      mermaid.default.initialize({
        startOnLoad: false,
        theme: resolvedTheme === 'dark' ? 'dark' : 'neutral',
        securityLevel: 'loose',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
      })
      mermaid.default
        .render(id, code)
        .then(({ svg: rendered }) => {
          if (!cancelled) setSvg(rendered)
        })
        .catch(() => {
          if (!cancelled) setSvg(`<pre>${code}</pre>`)
        })
    })
    return () => {
      cancelled = true
    }
  }, [code, id, resolvedTheme])

  return (
    <div
      className="my-8 overflow-x-auto rounded-xl border border-border/60 bg-card/50 p-6"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}

interface MarkdownViewerProps {
  path: string
  /** When provided, skips fetch (parent already loaded file). */
  initialContent?: string
}

export function MarkdownViewer({ path, initialContent }: MarkdownViewerProps) {
  const [content, setContent] = useState(initialContent ?? '')
  const [loading, setLoading] = useState(!initialContent)
  const completedTasks = useProgressStore((s) => s.completedTasks)
  const setTaskComplete = useProgressStore((s) => s.setTaskComplete)
  const markDocumentRead = useProgressStore((s) => s.markDocumentRead)
  const addXp = useGamificationStore((s) => s.addXp)
  const { fontSize, lineSpacing, contentWidth } = useSettingsStore()

  const tasks = useMemo(() => extractTasks(content, path), [content, path])

  useEffect(() => {
    if (initialContent !== undefined) {
      setContent(initialContent)
      setLoading(false)
      markDocumentRead(path)
      addXp(5)
      return
    }
    setLoading(true)
    loadMarkdownContent(path)
      .then((raw) => {
        setContent(raw)
        markDocumentRead(path)
        addXp(5)
      })
      .finally(() => setLoading(false))
  }, [path, initialContent, markDocumentRead, addXp])

  const widthClass =
    contentWidth === 'narrow' ? 'max-w-2xl' : contentWidth === 'wide' ? 'max-w-5xl' : 'max-w-3xl'

  if (loading) {
    return (
      <div className="animate-pulse space-y-6 py-4">
        <div className="h-10 w-2/3 rounded-lg bg-muted" />
        <div className="h-5 w-full rounded bg-muted" />
        <div className="h-5 w-5/6 rounded bg-muted" />
      </div>
    )
  }

  return (
    <article
      className={cn(
        'markdown-body prose prose-xl prose-slate dark:prose-invert mx-auto w-full',
        'prose-headings:scroll-mt-24',
        'prose-p:leading-[inherit] prose-li:leading-[inherit]',
        'prose-code:before:content-none prose-code:after:content-none',
        widthClass,
      )}
      style={{ fontSize: `${fontSize}px`, lineHeight: lineSpacing }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 className="!mt-0 !mb-7 border-b border-border/40 pb-5 text-3xl font-bold tracking-tight sm:text-4xl">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="!mt-11 !mb-5 text-2xl font-semibold tracking-tight">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="!mt-8 !mb-4 text-xl font-semibold">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="!mt-6 !mb-3 text-lg font-semibold">{children}</h4>
          ),
          p: ({ children }) => <p className="!mb-7 last:mb-0">{children}</p>,
          hr: () => <hr className="!my-12 border-border" />,
          img: ({ src, alt }) => (
            <img
              src={src ? resolveAssetUrl(path, src) : ''}
              alt={alt ?? ''}
              className="!my-8 mx-auto max-w-full rounded-xl border border-border/60 shadow-sm"
              loading="lazy"
            />
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="!my-8 rounded-r-xl border-l-4 border-primary bg-primary/5 px-5 py-4 not-italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="!my-8 overflow-x-auto rounded-xl border border-border/60">
              <table className="w-full min-w-full border-collapse text-[0.95em]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
          th: ({ children }) => (
            <th className="border border-border/60 px-4 py-3 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-border/60 px-4 py-3 align-top leading-relaxed">{children}</td>
          ),
          pre: ({ children }) => (
            <pre className="!my-8 overflow-x-auto rounded-xl border border-border/60 bg-secondary/70 p-5 text-[0.9em] leading-relaxed shadow-inner">
              {children}
            </pre>
          ),
          code: ({ className, children }) => {
            const text = String(children).replace(/\n$/, '')
            const lang = className?.replace('language-', '')
            const isBlock = Boolean(className)

            if (lang === 'mermaid') {
              return <MermaidBlock code={text} />
            }

            if (!isBlock) {
              return (
                <code className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[0.9em] font-medium">
                  {children}
                </code>
              )
            }

            return <code className={cn('block font-mono leading-relaxed', className)}>{children}</code>
          },
          ul: ({ className, children, ...props }) => (
            <ul className={cn('!mb-7 !mt-2 list-disc space-y-2 pl-7', className)} {...props}>
              {children}
            </ul>
          ),
          ol: ({ className, children, ...props }) => (
            <ol className={cn('!mb-7 !mt-2 list-decimal space-y-2 pl-7', className)} {...props}>
              {children}
            </ol>
          ),
          input: (props) => {
            if (props.type !== 'checkbox') {
              return <input {...props} />
            }
            const line = (props.node as { position?: { start: { line: number } } })?.position
              ?.start?.line
            const task = tasks.find((t) => t.line + 1 === line)
            const taskId = task?.id
            const isChecked = taskId
              ? (completedTasks[taskId] ?? task?.checked ?? false)
              : Boolean(props.checked)

            return (
              <button
                type="button"
                onClick={() => {
                  if (taskId) setTaskComplete(taskId, !isChecked)
                }}
                className={cn(
                  'mt-1.5 inline-flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded border transition-colors',
                  isChecked
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border hover:border-primary',
                )}
                aria-label={isChecked ? 'Mark incomplete' : 'Mark complete'}
              >
                {isChecked && <Check className="h-3 w-3" />}
              </button>
            )
          },
          li: ({ children, className, ...props }) => {
            const isTask = className?.includes('task-list-item')
            if (!isTask) {
              return (
                <li className={cn('!my-2 pl-1 leading-[inherit]', className)} {...props}>
                  {children}
                </li>
              )
            }
            return (
              <li
                className={cn(
                  'task-list-item !my-3 flex list-none items-start gap-3 py-1 pl-0 leading-[inherit]',
                  className,
                )}
                {...props}
              >
                {children}
              </li>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  )
}
