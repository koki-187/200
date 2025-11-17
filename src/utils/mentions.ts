/**
 * Extract @mentions from message content
 * Supports formats: @username, @"User Name", @email@example.com
 */
export function extractMentions(content: string): string[] {
  const mentions: string[] = [];
  
  // Pattern 1: @username (alphanumeric + underscore)
  const pattern1 = /@(\w+)/g;
  let match;
  while ((match = pattern1.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  // Pattern 2: @"User Name" (quoted names with spaces)
  const pattern2 = /@"([^"]+)"/g;
  while ((match = pattern2.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  // Pattern 3: @email@domain.com (email addresses)
  const pattern3 = /@([\w.-]+@[\w.-]+\.\w+)/g;
  while ((match = pattern3.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  // Remove duplicates
  return [...new Set(mentions)];
}

/**
 * Find user IDs from mention strings (email or name)
 */
export async function resolveMentionedUsers(
  mentions: string[],
  db: D1Database
): Promise<string[]> {
  const userIds: string[] = [];
  
  for (const mention of mentions) {
    // Try as email first
    if (mention.includes('@') && mention.includes('.')) {
      const user = await db
        .prepare('SELECT id FROM users WHERE email = ?')
        .bind(mention)
        .first<{ id: string }>();
      
      if (user) {
        userIds.push(user.id);
        continue;
      }
    }
    
    // Try as name (case-insensitive)
    const user = await db
      .prepare('SELECT id FROM users WHERE LOWER(name) = LOWER(?)')
      .bind(mention)
      .first<{ id: string }>();
    
    if (user) {
      userIds.push(user.id);
    }
  }
  
  // Remove duplicates
  return [...new Set(userIds)];
}

/**
 * Store mentions in database
 */
export async function storeMentions(
  messageId: string,
  userIds: string[],
  db: D1Database
): Promise<void> {
  for (const userId of userIds) {
    await db
      .prepare(`
        INSERT OR IGNORE INTO message_mentions (message_id, mentioned_user_id)
        VALUES (?, ?)
      `)
      .bind(messageId, userId)
      .run();
  }
}

/**
 * Get unread mentions for a user
 */
export async function getUnreadMentions(
  userId: string,
  db: D1Database
): Promise<any[]> {
  const { results } = await db
    .prepare(`
      SELECT 
        m.id as message_id,
        m.content,
        m.deal_id,
        m.sender_id,
        m.created_at,
        u.name as sender_name,
        d.title as deal_title
      FROM message_mentions mm
      INNER JOIN messages m ON mm.message_id = m.id
      INNER JOIN users u ON m.sender_id = u.id
      INNER JOIN deals d ON m.deal_id = d.id
      WHERE mm.mentioned_user_id = ? AND mm.is_notified = 0
      ORDER BY m.created_at DESC
    `)
    .bind(userId)
    .all();
  
  return results || [];
}

/**
 * Mark mentions as notified
 */
export async function markMentionsAsNotified(
  messageId: string,
  db: D1Database
): Promise<void> {
  await db
    .prepare(`
      UPDATE message_mentions 
      SET is_notified = 1 
      WHERE message_id = ?
    `)
    .bind(messageId)
    .run();
}

/**
 * Highlight mentions in message content (for frontend)
 */
export function highlightMentions(content: string): string {
  // Replace @mentions with HTML spans for highlighting
  let highlighted = content;
  
  // Pattern 1: @username
  highlighted = highlighted.replace(
    /@(\w+)/g,
    '<span class="mention" data-mention="$1">@$1</span>'
  );
  
  // Pattern 2: @"User Name"
  highlighted = highlighted.replace(
    /@"([^"]+)"/g,
    '<span class="mention" data-mention="$1">@"$1"</span>'
  );
  
  // Pattern 3: @email@domain.com
  highlighted = highlighted.replace(
    /@([\w.-]+@[\w.-]+\.\w+)/g,
    '<span class="mention" data-mention="$1">@$1</span>'
  );
  
  return highlighted;
}
