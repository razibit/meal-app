-- Deterministic local-development data. Do not run against production.
BEGIN;

INSERT INTO members(id,name,email,phone,role,active) VALUES
('10000000-0000-0000-0000-000000000001','Arafat Hossain','arafat@example.test','+8801711000001','admin',true),
('10000000-0000-0000-0000-000000000002','Nafis Ahmed','nafis@example.test','+8801711000002','member',true),
('10000000-0000-0000-0000-000000000003','Sakib Rahman','sakib@example.test','+8801711000003','member',true),
('10000000-0000-0000-0000-000000000004','Tanvir Islam','tanvir@example.test','+8801711000004','member',true),
('10000000-0000-0000-0000-000000000005','Mahin Chowdhury','mahin@example.test','+8801711000005','member',true),
('10000000-0000-0000-0000-000000000006','Fahim Karim','fahim@example.test','+8801711000006','member',true),
('10000000-0000-0000-0000-000000000007','Rafi Hasan','rafi@example.test','+8801711000007','member',true),
('10000000-0000-0000-0000-000000000008','Adnan Kabir','adnan@example.test','+8801711000008','member',true),
('10000000-0000-0000-0000-000000000009','Imran Sarker','imran@example.test','+8801711000009','member',true),
('10000000-0000-0000-0000-000000000010','Mehedi Alam','mehedi@example.test','+8801711000010','member',false)
ON CONFLICT(id) DO UPDATE SET name=excluded.name,email=excluded.email,phone=excluded.phone,active=excluded.active;

WITH dates AS (SELECT generate_series(date '2026-07-01',date '2026-07-31',interval '1 day')::date day),
people AS (SELECT id,row_number() OVER(ORDER BY id) n FROM members WHERE id::text LIKE '10000000-%' AND active)
INSERT INTO meals(member_id,meal_date,period,quantity)
SELECT p.id,d.day,period::meal_period,
  CASE WHEN p.n=9 AND extract(day from d.day)=15 AND period='dinner' THEN 4 ELSE 1 END
FROM dates d CROSS JOIN people p CROSS JOIN (VALUES('breakfast'),('lunch'),('dinner')) periods(period)
WHERE (extract(day from d.day)::int+p.n+CASE period WHEN 'breakfast' THEN 0 WHEN 'lunch' THEN 1 ELSE 2 END)%5<>0
ON CONFLICT(member_id,meal_date,period) DO UPDATE SET quantity=excluded.quantity;

INSERT INTO deposits(id,depositor_id,added_by,amount,accounting_date,details) VALUES
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001',1200,'2026-07-03','Opening deposit'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001',850.50,'2026-07-07','Cash deposit'),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001',1500,'2026-07-10','Monthly deposit'),
('20000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001',400,'2026-07-12','Partial deposit'),
('20000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001',2000,'2026-07-18','Advance'),
('20000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000001',975.25,'2026-07-21','Cash deposit'),
('20000000-0000-0000-0000-000000000007','10000000-0000-0000-0000-000000000008','10000000-0000-0000-0000-000000000001',300,'2026-07-25','Partial deposit')
ON CONFLICT(id) DO UPDATE SET amount=excluded.amount,accounting_date=excluded.accounting_date,details=excluded.details;

INSERT INTO grocery_expenses(id,shopper_id,added_by,transaction_type,details,amount,expense_date) VALUES
('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','cash','Rice and lentils',4200,'2026-07-04'),
('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','cash','Vegetables',2850,'2026-07-11'),
('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000006','10000000-0000-0000-0000-000000000001','credit','Fish and chicken',6100,'2026-07-19')
ON CONFLICT(id) DO UPDATE SET amount=excluded.amount,expense_date=excluded.expense_date;

COMMIT;

-- Independent reconciliation query.
WITH meal_totals AS (SELECT member_id,SUM(quantity)::numeric meals FROM meals WHERE meal_date BETWEEN '2026-07-01' AND '2026-07-31' GROUP BY member_id),
deposit_totals AS (SELECT depositor_id,SUM(amount) deposits FROM deposits WHERE accounting_date BETWEEN '2026-07-01' AND '2026-07-31' GROUP BY depositor_id),
rate AS (SELECT COALESCE((SELECT SUM(amount) FROM grocery_expenses WHERE expense_date BETWEEN '2026-07-01' AND '2026-07-31'),0)/NULLIF((SELECT SUM(meals) FROM meal_totals),0) value)
SELECT m.name,COALESCE(mt.meals,0) meals,COALESCE(dt.deposits,0) deposits,round(COALESCE(mt.meals,0)*COALESCE(rate.value,0)-COALESCE(dt.deposits,0),2) balance
FROM members m LEFT JOIN meal_totals mt ON mt.member_id=m.id LEFT JOIN deposit_totals dt ON dt.depositor_id=m.id CROSS JOIN rate
WHERE m.id::text LIKE '10000000-%' ORDER BY m.name;
