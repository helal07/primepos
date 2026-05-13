UPDATE auth.users 
SET email = 'email2itsolution@gmail.com',
    encrypted_password = crypt('IT121212@', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE id = '2cb936da-dd3b-4caa-abb9-da58b78e8100';

UPDATE auth.identities
SET identity_data = jsonb_set(identity_data, '{email}', '"email2itsolution@gmail.com"'),
    updated_at = now()
WHERE user_id = '2cb936da-dd3b-4caa-abb9-da58b78e8100' AND provider = 'email';

INSERT INTO public.user_roles (user_id, role_id, tenant_id)
VALUES ('2cb936da-dd3b-4caa-abb9-da58b78e8100',
        '5713dabb-a8b5-4429-8598-4175ae054205',
        NULL)
ON CONFLICT (user_id, role_id) DO NOTHING;

UPDATE public.profiles SET tenant_id = NULL WHERE user_id = '2cb936da-dd3b-4caa-abb9-da58b78e8100';