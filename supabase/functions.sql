--Functions
DROP FUNCTION get_pledges(integer,integer,text);
CREATE OR REPLACE FUNCTION get_pledges(page_index INTEGER, page_size INTEGER, filter TEXT)
RETURNS TABLE (
  id UUID,
  user_id TEXT,
  user_email TEXT,
  first_name TEXT,
  last_name TEXT,
  project_id UUID,
  project_title TEXT,
  amount DECIMAL,
  pledge_type TEXT,
  recurrence_interval TEXT,
  payment_day TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH filtered AS (
    SELECT 
      p.id,
      p.user_id,
      pr.email AS user_email,
      pr.first_name,
      pr.last_name,
      p.project_id,
      proj.title AS project_title,
      p.amount,
      p.pledge_type,
      p.recurrence_interval,
      p.payment_day,
      p.status,
      p.created_at,
      COUNT(*) OVER () AS total_count
    FROM pledges p
    LEFT JOIN profiles pr ON p.user_id = pr.id
    LEFT JOIN projects proj ON p.project_id = proj.id
    WHERE filter IS NULL OR (
      pr.email ILIKE '%' || filter || '%' OR
      proj.title ILIKE '%' || filter || '%' OR
      p.status ILIKE '%' || filter || '%'
    )
    ORDER BY p.created_at DESC
    LIMIT page_size OFFSET (page_index * page_size)
  )
  SELECT * FROM filtered;
END;
$$ LANGUAGE plpgsql;