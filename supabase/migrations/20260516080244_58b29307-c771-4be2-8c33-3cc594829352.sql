CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  -- Superadmins bypass
  IF v_uid IS NULL OR public.is_superadmin(v_uid) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'INSERT' AND NEW.user_id = v_uid THEN
    RAISE EXCEPTION 'You cannot change your own role';
  ELSIF TG_OP = 'UPDATE' AND (NEW.user_id = v_uid OR OLD.user_id = v_uid) THEN
    RAISE EXCEPTION 'You cannot change your own role';
  ELSIF TG_OP = 'DELETE' AND OLD.user_id = v_uid THEN
    RAISE EXCEPTION 'You cannot change your own role';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_self_role_change_trg ON public.user_roles;
CREATE TRIGGER prevent_self_role_change_trg
BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_change();