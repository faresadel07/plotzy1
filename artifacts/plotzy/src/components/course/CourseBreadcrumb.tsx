import { Fragment } from "react";
import { Link } from "wouter";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

/**
 * Course → Module → Lesson breadcrumb. Wraps the existing
 * <Breadcrumb> primitives. Each item with `href` becomes a SPA link
 * via wouter; the last item is rendered as <BreadcrumbPage> regardless
 * of its href.
 *
 * RTL: relies on the parent dir attribute. The default
 * <BreadcrumbSeparator> uses ChevronRight which visually flips because
 * its parent <ol> is `flex-row` and inherits dir from <html>.
 *
 * Reuses: existing <Breadcrumb> primitives.
 */

interface Crumb {
  label: string;
  href?: string;
}

interface CourseBreadcrumbProps {
  items: Crumb[];
  className?: string;
}

export function CourseBreadcrumb({ items, className = "" }: CourseBreadcrumbProps) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <Fragment key={idx}>
              <BreadcrumbItem>
                {item.href && !isLast ? (
                  <BreadcrumbLink asChild>
                    <Link href={item.href}>{item.label}</Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
