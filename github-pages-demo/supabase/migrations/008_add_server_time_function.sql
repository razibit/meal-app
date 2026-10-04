-- Add function to get server time for time synchronization
-- This allows clients to sync their clocks with the server

CREATE OR REPLACE FUNCTION get_server_time()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN now();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_server_time() TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_server_time() IS 'Returns current server timestamp for client time synchronization';
