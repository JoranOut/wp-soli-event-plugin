<?php

namespace Soli\Events;

if (!defined('ABSPATH')) exit;

/**
 * Single source of truth for event visibility (see PROJECT.md policy).
 *
 * Axes: post status (publicly readable requires `publish`), event-date status,
 * viewer role, and time. This class centralizes the date-status rules and the
 * PRIVATE title masking so every surface (REST, blocks, archive) stays in sync.
 *
 * Date-status visibility by viewer:
 *   - editor (edit_posts): every status (PUBLIC, PRIVATE, PENDING_APPROVAL, PLANNED, OPTION)
 *   - everyone else:       PUBLIC + PRIVATE only
 * PRIVATE titles are masked to "private" for NOT-logged-in visitors; logged-in
 * users (any role) see the real title.
 */
class EventVisibility {
  const STATUS_PUBLIC  = 'PUBLIC';
  const STATUS_PRIVATE = 'PRIVATE';

  // Statuses a public (non-editor) viewer may ever see.
  const PUBLIC_STATUSES = array(self::STATUS_PUBLIC, self::STATUS_PRIVATE);

  // Every stored status, incl. workflow states editors manage. OPTION is the
  // JS default (see F10) and is treated as a non-public workflow state.
  const ALL_STATUSES = array('PUBLIC', 'PRIVATE', 'PENDING_APPROVAL', 'PLANNED', 'OPTION');

  /** Whether the current viewer may see internal workflow-state dates. */
  static function canSeeAllStatuses(): bool {
    return current_user_can('edit_posts');
  }

  /** Date statuses the current viewer is allowed to see. */
  static function visibleDateStatuses(): array {
    return self::canSeeAllStatuses() ? self::ALL_STATUSES : self::PUBLIC_STATUSES;
  }

  /** PRIVATE titles are masked only for not-logged-in visitors. */
  static function shouldMaskPrivate(): bool {
    return !is_user_logged_in();
  }

  /** The label shown in place of a masked PRIVATE title. */
  static function maskedTitle(): string {
    return __('private', 'soli-event');
  }

  /**
   * Build a `status IN (...)` SQL fragment for PUBLIC feeds (list, calendar,
   * event-dates, next-concert), pushing bound values onto $params.
   *
   * Public feeds always show PUBLIC + PRIVATE only, for every viewer -- workflow
   * states (PLANNED/PENDING/OPTION) never appear on a public agenda, not even to
   * editors (they manage those in wp-admin / the create-event block). The only
   * viewer-dependent part of a public feed is PRIVATE title masking. The editing
   * endpoint GET /events/{id} is the role-aware exception (see filterVisibleRows).
   */
  static function statusInClause(string $alias, array &$params): string {
    $statuses = self::PUBLIC_STATUSES;
    $placeholders = implode(', ', array_fill(0, count($statuses), '%s'));
    foreach ($statuses as $s) {
      $params[] = $s;
    }
    return "$alias.status IN ($placeholders)";
  }

  /**
   * SQL SELECT expression for a post title that masks PRIVATE-date rows to
   * "private" when the viewer is not logged in. $date_alias.status drives the mask.
   */
  static function titleSelectExpr(string $date_alias, string $post_title_col): string {
    if (self::shouldMaskPrivate()) {
      return "CASE $date_alias.status WHEN '" . self::STATUS_PRIVATE . "' THEN 'private' ELSE $post_title_col END";
    }
    return $post_title_col;
  }

  /** Mask a single already-fetched row title (for PHP-side rendering). */
  static function maskTitle(?string $status, string $title): string {
    if ($status === self::STATUS_PRIVATE && self::shouldMaskPrivate()) {
      return self::maskedTitle();
    }
    return $title;
  }

  /** Keep only the date rows the current viewer may see (PHP-side filter). */
  static function filterVisibleRows(array $rows): array {
    if (self::canSeeAllStatuses()) {
      return $rows;
    }
    $allowed = self::PUBLIC_STATUSES;
    return array_values(array_filter($rows, function ($row) use ($allowed) {
      $status = is_array($row) ? ($row['status'] ?? null) : ($row->status ?? null);
      return in_array($status, $allowed, true);
    }));
  }
}
