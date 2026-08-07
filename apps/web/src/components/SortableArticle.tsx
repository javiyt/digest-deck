import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { NewsletterArticle } from "@digest-deck/shared";
import { ArticleCard } from "./ArticleCard";

interface Props {
  article: NewsletterArticle;
  index: number;
  total: number;
  onChange: (article: NewsletterArticle) => void;
  onDelete: () => void;
  onRestore: () => void;
  onMove: (direction: -1 | 1) => void;
}

export function SortableArticle(props: Props): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: props.article.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      <ArticleCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}
