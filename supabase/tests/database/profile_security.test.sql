begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users(id, raw_user_meta_data) values
 ('11111111-1111-4111-8111-111111111111', jsonb_build_object('full_name', repeat('N', 80))),
 ('22222222-2222-4222-8222-222222222222', '{"full_name":"   ","name":" Friend "}'),
 ('33333333-3333-4333-8333-333333333333', '{}'),
 ('44444444-4444-4444-8444-444444444444', '{}');
select is((select count(*)::integer from profiles where id::text in
 ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333','44444444-4444-4444-8444-444444444444')), 4, 'signup creates every profile');
select is((select length(display_name) from profiles where id='11111111-1111-4111-8111-111111111111'),50,'long signup name is bounded');
select is((select display_name from profiles where id='22222222-2222-4222-8222-222222222222'),'Friend','blank signup name falls back');
update profiles set role='admin' where id='44444444-4444-4444-8444-444444444444';
insert into friendships(requester_id,receiver_id,status) values
 ('11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','accepted'),
 ('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','pending');
insert into achievements(key,name) values ('profile_test_owned','Owned'),('profile_test_locked','Locked');
insert into user_achievements(user_id,achievement_key) values
 ('11111111-1111-4111-8111-111111111111','profile_test_owned');
insert into storage.objects(bucket_id,name) values
 ('avatars','11111111-1111-4111-8111-111111111111/one.png'),
 ('avatars','11111111-1111-4111-8111-111111111111/two.png'),
 ('avatars','22222222-2222-4222-8222-222222222222/other.png'),
 ('profile-banners','11111111-1111-4111-8111-111111111111/one.png'),
 ('profile-banners','11111111-1111-4111-8111-111111111111/two.png');

select ok(not exists (
  select 1 from pg_attribute a cross join (values ('anon'),('authenticated')) r(role)
  where a.attrelid='public.profiles'::regclass and a.attnum>0 and not a.attisdropped
  and (has_column_privilege(r.role,a.attrelid,a.attnum,'UPDATE')
       or has_column_privilege(r.role,a.attrelid,a.attnum,'INSERT'))), 'no client column INSERT/UPDATE grants survive');
select ok(not has_table_privilege('authenticated','public.profiles','DELETE,TRUNCATE,TRIGGER,REFERENCES'), 'no destructive table grants');
select ok(not has_table_privilege('anon','public.profiles','SELECT'), 'anon has no whole-table SELECT');
select ok(not has_table_privilege('authenticated','public.profiles','SELECT'), 'authenticated has no whole-table SELECT');
select ok(not exists (select 1 from information_schema.columns where table_schema='public'
  and table_name='public_profiles' and column_name in ('role','legacy_base44_id','push_enabled',
  'achievement_sound_enabled','profile_setup_completed','profile_setup_completed_at','preferred_language',
  'current_streak','last_activity_date','login_streak','favorite_mangas','updated_at')), 'view excludes private columns');
select ok((select reloptions @> array['security_invoker=true'] from pg_class where oid='public.public_profiles'::regclass),'view uses caller RLS');
select ok(not exists(select 1 from storage.buckets where id in ('avatars','profile-banners') and public),'media buckets are private');
select ok(not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in ('update_profile','complete_profile_setup','get_my_profile',
  'set_avatar','set_banner','remove_avatar','remove_banner','handle_new_user','validate_selected_badge')
  and has_function_privilege('anon',p.oid,'EXECUTE')), 'anon cannot execute profile mutations/private reader/triggers');

set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select is(get_my_profile()->>'profile_setup_completed','false','owner reads onboarding state');
select throws_ok($$select update_profile('{"bio":"before"}')$$,'P0001','PROFILE_SETUP_INCOMPLETE','editing requires setup');
select throws_ok($$select complete_profile_setup(null,'Name','pt')$$,'P0001','USERNAME_REQUIRED','null username rejected');
select throws_ok($$select complete_profile_setup('testowner',null,'pt')$$,'P0001','DISPLAY_NAME_REQUIRED','null name rejected');
select throws_ok($$select complete_profile_setup('testowner','Name',null)$$,'P0001','INVALID_LANGUAGE','null language rejected');
select throws_ok($$select complete_profile_setup('ab','Name','pt')$$,'P0001','INVALID_USERNAME_LENGTH','short username rejected');
select throws_ok($$select complete_profile_setup('test__owner','Name','pt')$$,'P0001','INVALID_USERNAME_FORMAT','invalid username rejected');
select throws_ok($$select complete_profile_setup('AdminTest','Name','pt')$$,'P0001','RESERVED_USERNAME','reserved username rejected');
select throws_ok($$select complete_profile_setup('testowner',repeat('n',51),'pt')$$,'P0001','INVALID_DISPLAY_NAME_LENGTH','long name rejected');
select throws_ok($$select complete_profile_setup('testowner','Name','es')$$,'P0001','INVALID_LANGUAGE','unsupported language rejected');
select is(complete_profile_setup(' TestOwner ',' Owner ',' EN ')->>'status','COMPLETED','valid setup succeeds');
select is(get_my_profile()->>'username','TestOwner','setup trims username');
select is(get_my_profile()->>'preferred_language','en','setup normalizes language');
select isnt(get_my_profile()->>'profile_setup_completed_at',null,'completion timestamp exists');
select is(complete_profile_setup('Changed','Changed','pt')->>'status','ALREADY_COMPLETED','setup retry is idempotent');
select is(get_my_profile()->>'username','TestOwner','setup retry cannot edit');

select throws_ok($$update profiles set bio='bypass' where id=auth.uid()$$,'42501',null,'direct field update denied');
select throws_ok($$update public_profiles set bio='bypass' where id=auth.uid()$$,'42501',null,'view update denied');
select throws_ok($$insert into profiles(id,username) values(auth.uid(),'bypass')$$,'42501',null,'direct insert denied');
select throws_ok($$delete from profiles where id=auth.uid()$$,'42501',null,'direct delete denied');
select throws_ok($$select push_enabled from profiles$$,'42501',null,'private preferences not queryable directly');
select throws_ok($$select * from profiles$$,'42501',null,'select star denied even for owner');
select throws_ok($$select role from public_profiles$$,'42703',null,'public view has no role');
select throws_ok($$select update_profile(null)$$,'P0001','INVALID_PAYLOAD','SQL null payload rejected');
select throws_ok($$select update_profile('null')$$,'P0001','INVALID_PAYLOAD','JSON null payload rejected');
select throws_ok($$select update_profile('[]')$$,'P0001','INVALID_PAYLOAD','array payload rejected');
select throws_ok($$select update_profile('{"role":"admin"}')$$,'P0001','UNSUPPORTED_FIELD','role escalation denied');
select throws_ok($$select update_profile('{"id":"22222222-2222-4222-8222-222222222222"}')$$,'P0001','UNSUPPORTED_FIELD','identity mutation denied');
select throws_ok($$select update_profile('{"profile_setup_completed":false}')$$,'P0001','UNSUPPORTED_FIELD','setup state protected');
select throws_ok($$select update_profile('{"favorite_mangas":[]}')$$,'P0001','UNSUPPORTED_FIELD','legacy manga not added to API');
select throws_ok($$select update_profile('{"avatar_url":null}')$$,'P0001','UNSUPPORTED_FIELD','avatar bypass denied');
select throws_ok($$select update_profile('{"banner_url":"fake"}')$$,'P0001','UNSUPPORTED_FIELD','banner bypass denied');
select throws_ok($$select update_profile('{"username":123}')$$,'P0001','INVALID_FIELD_TYPE: username','number username rejected');
select throws_ok($$select update_profile('{"display_name":{}}')$$,'P0001','INVALID_FIELD_TYPE: display_name','object name rejected');
select throws_ok($$select update_profile('{"country":true}')$$,'P0001','INVALID_FIELD_TYPE: country','boolean country rejected');
select throws_ok($$select update_profile('{"push_enabled":"true"}')$$,'P0001','INVALID_FIELD_TYPE: push_enabled','boolean string rejected');
select throws_ok($$select update_profile('{"achievement_sound_enabled":null}')$$,'P0001','INVALID_FIELD_TYPE: achievement_sound_enabled','null boolean rejected');
select throws_ok($$select update_profile('{"profile_visibility":"everyone"}')$$,'P0001','INVALID_PROFILE_VISIBILITY','bad profile visibility rejected');
select throws_ok($$select update_profile('{"list_visibility":"everyone"}')$$,'P0001','INVALID_LIST_VISIBILITY','bad list visibility rejected');
select throws_ok($$select update_profile(jsonb_build_object('bio',repeat('x',301)))$$,'P0001','INVALID_BIO_LENGTH','long bio rejected');
select throws_ok($$select update_profile('{"country":"BRA"}')$$,'P0001','INVALID_COUNTRY','bad country rejected');
select throws_ok($$select update_profile('{"links":{"website":"javascript:alert(1)"}}')$$,'P0001','INVALID_LINKS','unsafe link scheme rejected');
select throws_ok($$select update_profile('{"links":{"unknown":"https://example.com"}}')$$,'P0001','INVALID_LINKS','unknown link key rejected');
select throws_ok($$select update_profile('{"links":null}')$$,'P0001','INVALID_LINKS','null links rejected');
select throws_ok($$select update_profile('{"favorite_animes":null}')$$,'P0001','INVALID_FAVORITE_ANIMES','null favorites rejected');
select throws_ok($$select update_profile('{"favorite_animes":"naruto"}')$$,'P0001','INVALID_FAVORITE_ANIMES','scalar favorites rejected');
select throws_ok($$select update_profile('{"favorite_animes":[1]}')$$,'P0001','INVALID_FAVORITE_ANIMES','numeric favorite rejected');
select throws_ok($$select update_profile('{"favorite_animes":[null]}')$$,'P0001','INVALID_FAVORITE_ANIMES','null favorite rejected');
select throws_ok($$select update_profile('{"favorite_animes":[["naruto"]]}')$$,'P0001','INVALID_FAVORITE_ANIMES','nested favorites rejected');
select throws_ok($$select update_profile('{"favorite_animes":[" "]}')$$,'P0001','INVALID_FAVORITE_ANIMES','blank favorite rejected');
select lives_ok($$select update_profile('{"country":" br ","bio":" Bio ","favorite_animes":[" Naruto ","One Piece"],"links":{"x":"https://x.com/zoku"},"push_enabled":true,"achievement_sound_enabled":false}')$$,'valid update succeeds');
select is(get_my_profile()->>'country','BR','country normalized uppercase');
select is(get_my_profile()->>'bio','Bio','bio trimmed');
select is(get_my_profile()->'favorite_animes','["Naruto","One Piece"]'::jsonb,'favorites preserve order and normalize spaces');
select is(get_my_profile()->>'push_enabled','true','boolean preference stored');
select throws_ok($$select update_profile('{"bio":"rollback","favorite_animes":[false]}')$$,'P0001','INVALID_FAVORITE_ANIMES','mixed invalid update rejected');
select is(get_my_profile()->>'bio','Bio','invalid update is atomic');
select lives_ok($$select update_profile('{"country":null,"bio":null,"favorite_animes":[],"links":{}}')$$,'optional values can be cleared');
select is(get_my_profile()->'favorite_animes','[]'::jsonb,'empty favorites remains nonnull');
select is(get_my_profile()->>'country',null,'country clears to SQL null');
select lives_ok($$select update_profile('{}')$$,'empty patch permitted');

select throws_ok($$select update_profile('{"selected_badge_id":"missing"}')$$,'P0001','INVALID_BADGE','unknown badge rejected');
select throws_ok($$select update_profile('{"selected_badge_id":"profile_test_locked"}')$$,'P0001','BADGE_NOT_UNLOCKED','unearned badge rejected');
select lives_ok($$select update_profile('{"selected_badge_id":"profile_test_owned"}')$$,'earned badge accepted');
select is(get_my_profile()->>'selected_badge_id','profile_test_owned','earned badge stored');
reset role;
delete from user_achievements where user_id='11111111-1111-4111-8111-111111111111' and achievement_key='profile_test_owned';
select is((select selected_badge_id from profiles where id='11111111-1111-4111-8111-111111111111'),null,'revoking badge clears selection');
set local role authenticated;
select lives_ok($$select update_profile('{"selected_badge_id":null}')$$,'badge can be cleared');

select throws_ok($$select set_avatar(null)$$,'P0001','INVALID_AVATAR_PATH','null avatar path rejected');
select throws_ok($$select set_avatar('22222222-2222-4222-8222-222222222222/other.png')$$,'P0001','INVALID_AVATAR_PATH','other users avatar rejected');
select throws_ok($$select set_avatar('11111111-1111-4111-8111-111111111111/missing.png')$$,'P0001','AVATAR_NOT_FOUND','missing avatar rejected');
select throws_ok($$select set_banner('https://example.com/image.png')$$,'P0001','INVALID_BANNER_PATH','external banner rejected');
select throws_ok($$select set_banner('11111111-1111-4111-8111-111111111111/missing.png')$$,'P0001','BANNER_NOT_FOUND','missing banner rejected');
select lives_ok($$select set_avatar('11111111-1111-4111-8111-111111111111/one.png')$$,'existing owned avatar accepted');
select lives_ok($$select set_banner('11111111-1111-4111-8111-111111111111/one.png')$$,'existing owned banner accepted');
select throws_ok($$select update_profile('{"avatar_crop":{"version":2,"zoom":1,"offsetXPct":0,"offsetYPct":0,"imageUrl":"https://example.com/evil.png"}}')$$,'P0001','AVATAR_CROP_PATH_MISMATCH','crop cannot replace media');
select throws_ok($$select update_profile('{"banner_crop":{"version":2,"zoom":11,"offsetXPct":0,"offsetYPct":0,"imageUrl":"x"}}')$$,'P0001','INVALID_BANNER_CROP','invalid crop geometry rejected');
select lives_ok($$select update_profile('{"avatar_crop":{"version":2,"zoom":1.5,"offsetXPct":0,"offsetYPct":0,"imageUrl":"11111111-1111-4111-8111-111111111111/one.png"},"banner_crop":{"version":2,"zoom":1,"offsetXPct":0,"offsetYPct":0,"imageUrl":"11111111-1111-4111-8111-111111111111/one.png"}}')$$,'valid bound crops accepted');
select lives_ok($$select set_avatar('11111111-1111-4111-8111-111111111111/two.png')$$,'avatar replacement succeeds');
select is(get_my_profile()->'avatar_crop','null'::jsonb,'replacement clears stale avatar crop');
select lives_ok($$select update_profile('{"banner_crop":null}')$$,'crop JSON null clears');
select is(get_my_profile()->'banner_crop','null'::jsonb,'crop stores SQL null');

-- Visibility matrix: owner, accepted friend, pending stranger, admin and anon.
select lives_ok($$select update_profile('{"profile_visibility":"friends","list_visibility":"private"}')$$,'friends profile and private list stored separately');
select is((select count(*)::integer from public_profiles where id=auth.uid()),1,'owner sees friends profile');
select is((select count(*)::integer from storage.objects where name like '11111111-1111-4111-8111-111111111111/%'),4,'owner sees selected and unpublished media');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select throws_ok($$select complete_profile_setup('testowner','Friend','pt')$$,'P0001','USERNAME_TAKEN','username uniqueness is case insensitive');
select is(complete_profile_setup('TestFriend','Friend','pt')->>'status','COMPLETED','second user onboarding works');
select is((select count(*)::integer from public_profiles where id='11111111-1111-4111-8111-111111111111'),1,'accepted friend sees friends profile');
select is((select count(*)::integer from storage.objects where name like '11111111-1111-4111-8111-111111111111/%'),2,'friend sees only current media');
select is(get_my_profile()->>'id','22222222-2222-4222-8222-222222222222','private RPC fixed to requesting user');
select set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
select is((select count(*)::integer from public_profiles where id='11111111-1111-4111-8111-111111111111'),0,'pending friendship grants no profile access');
select is((select count(*)::integer from storage.objects where name like '11111111-1111-4111-8111-111111111111/%'),0,'pending friendship grants no media access');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::integer from public_profiles where id='11111111-1111-4111-8111-111111111111'),0,'anon cannot see friends profile');
select is((select count(*)::integer from storage.objects where name like '11111111-1111-4111-8111-111111111111/%'),0,'anon cannot see friends media');
select throws_ok($$select get_my_profile()$$,'42501',null,'anon private reader denied');
select throws_ok($$select update_profile('{}')$$,'42501',null,'anon mutation denied');
set local role authenticated;
select throws_ok($$select get_my_profile()$$,'P0001','NOT_AUTHENTICATED','missing JWT identity rejected');
select throws_ok($$select set_avatar('x')$$,'P0001','NOT_AUTHENTICATED','missing JWT avatar rejected');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select update_profile('{"profile_visibility":"private"}');
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
select is((select count(*)::integer from public_profiles where id='11111111-1111-4111-8111-111111111111'),0,'friend cannot see private profile');
select is((select count(*)::integer from storage.objects where name like '11111111-1111-4111-8111-111111111111/%'),0,'friend cannot see private media');
select set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
select is((select count(*)::integer from public_profiles where id='11111111-1111-4111-8111-111111111111'),1,'existing admin visibility preserved');
select is((select count(*)::integer from storage.objects where name like '11111111-1111-4111-8111-111111111111/%'),2,'admin sees selected media only');
select throws_ok($$select push_enabled from profiles$$,'42501',null,'admin client has no broad private-column access');
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select update_profile('{"profile_visibility":"public"}');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::integer from public_profiles where id='11111111-1111-4111-8111-111111111111'),1,'anon sees public profile');
select is((select count(*)::integer from storage.objects where name like '11111111-1111-4111-8111-111111111111/%'),2,'anon sees only selected public media');
select throws_ok($$select legacy_base44_id from profiles$$,'42501',null,'anon cannot read import metadata');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
select is(remove_avatar()->>'status','REMOVED','avatar removed');
select is(remove_avatar()->>'status','NO_AVATAR','avatar removal idempotent');
select is(remove_banner()->>'status','REMOVED','banner removed');
select is(remove_banner()->>'status','NO_BANNER','banner removal idempotent');
select is(get_my_profile()->>'avatar_url',null,'avatar path cleared');
select is(get_my_profile()->>'banner_url',null,'banner path cleared');
set local role anon;
select set_config('request.jwt.claim.sub','',true);
select is((select count(*)::integer from storage.objects where name like '11111111-1111-4111-8111-111111111111/%'),0,'unlinked files no longer shared');
reset role;

select * from finish();
rollback;
