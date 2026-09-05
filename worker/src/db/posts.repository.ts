import type pg from 'pg';

/**
 * Post-related queries. The repository owns SQL; services never write
 * queries inline. All methods receive the pool via injection (tests can
 * pass a fake) — nothing here imports db/client.ts.
 */

export interface PostRecord {
  id: string;
  spotify_track_id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  stream_links: Record<string, string>;
  created_at: Date;
}

export interface NewPost {
  spotifyTrackId: string;
  title: string;
  artist: string;
  coverUrl: string | null;
}

export interface PostsRepository {
  insertPost(post: NewPost): Promise<PostRecord>;
  saveStreamLinks(postId: string, links: Record<string, string>): Promise<PostRecord>;
  findPostById(postId: string): Promise<PostRecord | null>;
}

/**
 * Creates the posts repository bound to a Postgres pool.
 *
 * Usage:
 *   const posts = createPostsRepository(getPool());
 *   const post = await posts.insertPost({ spotifyTrackId, title, artist, coverUrl });
 */
export function createPostsRepository(pool: pg.Pool): PostsRepository {
  async function insertPost(post: NewPost): Promise<PostRecord> {
    const result = await pool.query<PostRecord>(
      `INSERT INTO posts (spotify_track_id, title, artist, cover_url)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [post.spotifyTrackId, post.title, post.artist, post.coverUrl],
    );
    return result.rows[0]!;
  }

  async function saveStreamLinks(
    postId: string,
    links: Record<string, string>,
  ): Promise<PostRecord> {
    const result = await pool.query<PostRecord>(
      `UPDATE posts
       SET stream_links = $2
       WHERE id = $1
       RETURNING *`,
      [postId, JSON.stringify(links)],
    );
    if (result.rows.length === 0) {
      throw new Error(
        `[posts.repository] Expected an existing post id for saveStreamLinks, got: ${JSON.stringify(postId)} (no row updated)`,
      );
    }
    return result.rows[0]!;
  }

  async function findPostById(postId: string): Promise<PostRecord | null> {
    const result = await pool.query<PostRecord>(`SELECT * FROM posts WHERE id = $1`, [postId]);
    return result.rows[0] ?? null;
  }

  return { insertPost, saveStreamLinks, findPostById };
}
