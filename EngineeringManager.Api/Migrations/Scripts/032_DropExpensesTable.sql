-- 032: 移除废弃的 expenses 表
-- 背景: expenses 为 001 初始 schema 遗留的半成品，字段为 cost_ledger 的真子集，
--       前端无页面组件，路由 showInSidebar:false，全库零数据（Phase 0 核实 total=0）。
-- 配套: Program.cs 的 EnsureTables() 中同名 CREATE TABLE 已一并移除，否则本 DROP 会被重建撤销。
DROP TABLE IF EXISTS expenses;
