begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
select ok(false, 'falha injetada (prova da CI, não mesclar)');
select * from finish();
rollback;
