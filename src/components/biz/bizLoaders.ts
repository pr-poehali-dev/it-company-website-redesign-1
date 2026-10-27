import { notFound } from "@tanstack/react-router";
import { BizDatabase, CompanyReport, DbResponse, MarketReport, Overview, bizPublic } from "./bizApi";

export async function loadOverview() {
  const { data } = await bizPublic<Overview>({ action: "overview" });
  return { overview: data };
}

export async function loadDatabases() {
  const { data } = await bizPublic<{ items: BizDatabase[] }>({ action: "databases" });
  return { items: data?.items ?? null };
}

const OKVED_RX = /^(\d{2}(\.\d{1,2}){0,2}|ALL)$/;

export async function loadMarket(okved: string, region = "RU") {
  if (!OKVED_RX.test(okved) || !/^(\d{2}|RU)$/.test(region)) throw notFound();
  const { status, data } = await bizPublic<MarketReport>({ action: "market", okved, region });
  if (status === 404) throw notFound();
  return { report: data };
}

export async function loadCompany(inn: string) {
  if (!/^\d{10}(\d{2})?$/.test(inn)) throw notFound();
  const { status, data } = await bizPublic<CompanyReport>({ action: "company", inn });
  if (status === 404) throw notFound();
  return { report: data };
}

export async function loadDatabase(slug: string) {
  if (slug === "constructor") return { db: null };
  if (!/^[a-z0-9-]{2,60}$/.test(slug)) throw notFound();
  const { status, data } = await bizPublic<DbResponse>({ action: "db", slug });
  if (status === 404) throw notFound();
  return { db: data };
}