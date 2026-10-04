-- Deterministic July 2026 development fixture. Never run against production.
BEGIN;

INSERT INTO members(id,name,email,phone,role,active) VALUES
('10000000-0000-0000-0000-000000000001','Arafat Hossain','arafat@example.test','+8801711000001','admin',true),
('10000000-0000-0000-0000-000000000002','Nafis Ahmed','nafis@example.test','+8801812000002','member',true),
('10000000-0000-0000-0000-000000000003','Sakib Rahman','sakib@example.test','+8801913000003','member',true),
('10000000-0000-0000-0000-000000000004','Tanvir Islam','tanvir@example.test','+8801614000004','member',true),
('10000000-0000-0000-0000-000000000005','Mahin Chowdhury','mahin@example.test','+8801515000005','member',true),
('10000000-0000-0000-0000-000000000006','Fahim Karim','fahim@example.test','+8801716000006','member',true),
('10000000-0000-0000-0000-000000000007','Rafi Hasan','rafi@example.test','+8801817000007','member',true),
('10000000-0000-0000-0000-000000000008','Adnan Kabir','adnan@example.test','+8801918000008','member',true),
('10000000-0000-0000-0000-000000000009','Imran Sarker','imran@example.test','+8801619000009','member',true),
('10000000-0000-0000-0000-000000000010','Mehedi Alam','mehedi@example.test','+8801520000010','member',true),
('10000000-0000-0000-0000-000000000011','Zubair Mahmud','zubair@example.test','+8801721000011','member',true),
('10000000-0000-0000-0000-000000000012','Shafin Khan','shafin@example.test','+8801822000012','member',true),
('10000000-0000-0000-0000-000000000013','Rakibul Haque','rakibul@example.test','+8801923000013','member',true),
('10000000-0000-0000-0000-000000000014','Farhan Amin','farhan@example.test','+8801624000014','member',true),
('10000000-0000-0000-0000-000000000015','Saif Uddin','saif@example.test','+8801525000015','member',true),
('10000000-0000-0000-0000-000000000016','Nayeem Mirza','nayeem@example.test','+8801726000016','member',true),
('10000000-0000-0000-0000-000000000017','Arman Faisal','arman@example.test','+8801827000017','member',true),
('10000000-0000-0000-0000-000000000018','Tahmid Noor','tahmid@example.test','+8801928000018','member',false)
ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,phone=excluded.phone,role=excluded.role,active=excluded.active;

DELETE FROM meals WHERE member_id::text LIKE '10000000-%' AND meal_date BETWEEN '2026-07-01' AND '2026-07-31';
DELETE FROM deposits WHERE id::text LIKE '20000000-%';
DELETE FROM grocery_expenses WHERE id::text LIKE '30000000-%';
DELETE FROM ocr_imports WHERE id::text LIKE '50000000-%';
DELETE FROM meal_rate_history WHERE id='40000000-0000-0000-0000-000000000001';

WITH dates AS (SELECT generate_series(date '2026-07-01',date '2026-07-31',interval '1 day')::date AS meal_day),
people AS (SELECT id,row_number() OVER(ORDER BY id) n FROM members WHERE id::text LIKE '10000000-%')
INSERT INTO meals(member_id,meal_date,period,quantity)
SELECT p.id,d.meal_day,v.period::meal_period,
  CASE WHEN p.n=7 AND extract(isodow FROM d.meal_day) IN (5,6) THEN 2 WHEN p.n=17 AND d.meal_day='2026-07-31' THEN 5 ELSE 1 END
FROM dates d CROSS JOIN people p CROSS JOIN (VALUES('breakfast'),('lunch'),('dinner')) v(period)
WHERE d.meal_day<>'2026-07-20'
  AND NOT (p.n=3 AND d.meal_day BETWEEN '2026-07-08' AND '2026-07-12')
  AND NOT (p.n=9 AND d.meal_day BETWEEN '2026-07-22' AND '2026-07-27')
  AND NOT (p.n=18 AND d.meal_day>'2026-07-15')
  AND NOT (p.n=6 AND NOT (d.meal_day IN ('2026-07-03','2026-07-15','2026-07-28') AND v.period='dinner'))
  AND NOT (p.n IN (2,8,14) AND v.period='breakfast' AND extract(day FROM d.meal_day)::int%2=1)
  AND NOT (p.n IN (4,10,16) AND v.period='lunch' AND extract(day FROM d.meal_day)::int%4=0)
  AND NOT (p.n IN (5,11,15) AND v.period='dinner' AND extract(day FROM d.meal_day)::int%5 IN (0,1))
  AND NOT (p.n IN (12,13,17) AND (extract(day FROM d.meal_day)::int+p.n+CASE v.period WHEN 'breakfast' THEN 0 WHEN 'lunch' THEN 2 ELSE 4 END)%7=0);

INSERT INTO deposits(id,depositor_id,added_by,amount,accounting_date,details) VALUES
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',1800,'2026-07-01','Opening balance'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',600,'2026-07-03','First installment'),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',750,'2026-07-19','Second installment'),
('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001',500,'2026-07-07','Partial deposit'),
('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001',2200,'2026-07-10','Advance deposit'),
('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001',950.50,'2026-07-12','Cash deposit'),
('20000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000001',3000,'2026-07-15','High advance'),
('20000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000001',400,'2026-07-18','Small installment'),
('20000000-0000-0000-0000-000000000009','10000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000001',650,'2026-07-29','Final installment'),
('20000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000010','10000000-0000-0000-0000-000000000001',1100,'2026-07-20','Monthly deposit'),
('20000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000001',725.25,'2026-07-22','Cash deposit'),
('20000000-0000-0000-0000-000000000012','10000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000001',1600,'2026-07-25','Full deposit'),
('20000000-0000-0000-0000-000000000013','10000000-0000-0000-0000-000000000014','10000000-0000-0000-0000-000000000001',250,'2026-07-26','Token deposit'),
('20000000-0000-0000-0000-000000000014','10000000-0000-0000-0000-000000000016','10000000-0000-0000-0000-000000000001',2400,'2026-07-28','Advance for next month'),
('20000000-0000-0000-0000-000000000015','10000000-0000-0000-0000-000000000017','10000000-0000-0000-0000-000000000001',875,'2026-07-30','Late deposit');

INSERT INTO grocery_expenses(id,shopper_id,added_by,transaction_type,details,amount,expense_date) VALUES
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','cash','Rice and lentils',5200,'2026-07-02'),
('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','cash','Vegetables and spices',3150,'2026-07-08'),
('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000001','credit','Fish and chicken',7600,'2026-07-14'),
('30000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000011','10000000-0000-0000-0000-000000000001','cash','Cooking oil and gas',4100,'2026-07-21'),
('30000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000016','10000000-0000-0000-0000-000000000001','credit','Beef and groceries',6850,'2026-07-27');

INSERT INTO ocr_imports(id,meal_date,file_name,mime_type,status,validation_status,validation_report,breakfast_total,lunch_total,dinner_total,model_metadata,created_by,processed_at,applied_at,raw_output) VALUES
('50000000-0000-0000-0000-000000000001','2026-07-05','whiteboard-2026-07-05.jpg','image/jpeg','applied','valid','{"valid":true,"errors":[],"warnings":[],"source":"seed"}',12,15,14,'{"model":"seed-fixture"}','10000000-0000-0000-0000-000000000001','2026-07-05 18:30+06','2026-07-05 18:35+06','{"fixture":true}'),
('50000000-0000-0000-0000-000000000002','2026-07-12','whiteboard-2026-07-12.jpg','image/jpeg','validation_failed','invalid','{"valid":false,"errors":["Unmatched name: R. Hasan"],"warnings":["Low contrast image"],"source":"seed"}',11,13,12,'{"model":"seed-fixture"}','10000000-0000-0000-0000-000000000001','2026-07-12 18:20+06',NULL,'{"fixture":true}');

INSERT INTO ocr_import_rows(import_id,detected_name,matched_member_id,breakfast,lunch,dinner,confidence,needs_review,notes)
SELECT '50000000-0000-0000-0000-000000000001',m.name,m.id,
  EXISTS(SELECT 1 FROM meals WHERE member_id=m.id AND meal_date='2026-07-05' AND period='breakfast'),
  EXISTS(SELECT 1 FROM meals WHERE member_id=m.id AND meal_date='2026-07-05' AND period='lunch'),
  EXISTS(SELECT 1 FROM meals WHERE member_id=m.id AND meal_date='2026-07-05' AND period='dinner'),0.97,false,'Applied OCR fixture'
FROM members m WHERE m.id::text LIKE '10000000-%' AND m.active;
INSERT INTO ocr_import_rows(import_id,detected_name,matched_member_id,breakfast,lunch,dinner,confidence,needs_review,notes)
VALUES('50000000-0000-0000-0000-000000000002','R. Hasan',NULL,true,true,false,0.58,true,'Ambiguous seeded OCR row');

UPDATE admin_notes SET content='July development fixture: verify the zero-meal day on Jul 20, consecutive absences, OCR review history, split deposits, and high-quantity meals.',updated_by='10000000-0000-0000-0000-000000000001' WHERE id=true;

INSERT INTO meal_rate_history(id,meal_rate,total_expenses,total_meals,trigger_source,period_start,period_end)
SELECT '40000000-0000-0000-0000-000000000001',round(SUM(expense)/NULLIF(SUM(meals),0),8),SUM(expense),SUM(meals)::integer,'manual','2026-07-01','2026-07-31'
FROM (SELECT COALESCE((SELECT SUM(amount) FROM grocery_expenses WHERE expense_date::date BETWEEN '2026-07-01' AND '2026-07-31'),0) expense,
             COALESCE((SELECT SUM(quantity) FROM meals WHERE meal_date BETWEEN '2026-07-01' AND '2026-07-31' AND member_id::text LIKE '10000000-%'),0) meals) totals;

COMMIT;

-- Reconciliation: balance > 0 means Give; balance < 0 means Receive.
WITH mt AS (SELECT member_id,SUM(quantity)::numeric meals FROM meals WHERE meal_date BETWEEN '2026-07-01' AND '2026-07-31' GROUP BY member_id),
dt AS (SELECT depositor_id,SUM(amount) deposits FROM deposits WHERE accounting_date BETWEEN '2026-07-01' AND '2026-07-31' GROUP BY depositor_id),
rate AS (SELECT meal_rate FROM meal_rate_history WHERE period_start='2026-07-01' AND period_end='2026-07-31' ORDER BY created_at DESC LIMIT 1)
SELECT m.name,m.active,COALESCE(mt.meals,0) meals,rate.meal_rate,round(COALESCE(mt.meals,0)*rate.meal_rate,2) meal_cost,
  COALESCE(dt.deposits,0) deposits,round(COALESCE(mt.meals,0)*rate.meal_rate-COALESCE(dt.deposits,0),2) balance
FROM members m LEFT JOIN mt ON mt.member_id=m.id LEFT JOIN dt ON dt.depositor_id=m.id CROSS JOIN rate
WHERE m.id::text LIKE '10000000-%' ORDER BY m.name;
