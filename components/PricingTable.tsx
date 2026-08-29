"use client";

import React, { useMemo, useState } from "react";
import type { CalculatedLine } from "@/lib/pricing";
import { MIN_MARKUP_PCT, calculateQuote } from "@/lib/pricing";
import type { Quote, LineItem } from "@/lib/types";

const money = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
});
const exactMoney = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
});
const pct = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
    style: "percent",
});

type EditingCell = { lineId: string; field: "commPct" | "mrkpPct" } | null;

function formatMoney(value: number | null, currency = "$") {
    if (value === null) return "—";
    return `${currency}${money.format(value)}`;
}

function ConfidenceDot({ line }: { line: LineItem }) {
    const color = line.confirmed
        ? "bg-emerald-700"
        : line.rate.confidence === "low"
          ? "border-blue-700"
          : "border-amber-600";
    return (
        <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full ${line.confirmed ? color : `border-2 ${color}`}`}
        >
            {line.confirmed ? (
                <span className='text-xs text-white'>✓</span>
            ) : null}
        </span>
    );
}

function EditablePct({
    value,
    onChange,
    editing,
    setEditing,
    label,
    warning,
}: {
    value: number;
    onChange: (value: number) => void;
    editing: boolean;
    setEditing: (editing: boolean) => void;
    label: string;
    warning?: string;
}) {
    return (
        <div className='flex min-w-[84px] items-center justify-end gap-1'>
            {editing ? (
                <input
                    aria-label={label}
                    className='w-16 rounded-lg border border-[#d9cdbf] bg-white px-2 py-1 text-right font-semibold outline-none ring-[#bd6845] focus:ring-2'
                    autoFocus
                    type='number'
                    min='0'
                    value={value}
                    onChange={(event) =>
                        onChange(Math.max(0, Number(event.target.value)))
                    }
                    onBlur={() => setEditing(false)}
                    onKeyDown={(event) =>
                        event.key === "Enter" && setEditing(false)
                    }
                />
            ) : (
                <button
                    className='rounded-lg px-2 py-1 font-bold hover:bg-[#f0e4d7]'
                    onClick={() => setEditing(true)}
                    title={warning ?? `Edit ${label}`}
                >
                    {value}% <span className='text-[#bd6845]'>✎</span>
                </button>
            )}
        </div>
    );
}

function Row({
    item,
    onLineChange,
    editing,
    setEditing,
    estimatedNetts,
    setEstimatedNetts,
}: {
    item: CalculatedLine;
    onLineChange: (lineId: string, patch: Partial<LineItem>) => void;
    editing: EditingCell;
    setEditing: (cell: EditingCell) => void;
    estimatedNetts: Record<string, number>;
    setEstimatedNetts: React.Dispatch<
        React.SetStateAction<Record<string, number>>
    >;
}) {
    const { line } = item;
    return (
        <tr
            className={`border-b border-[#eadfd1] align-middle ${
                item.isMarkupClamped
                    ? "bg-red-50"
                    : item.estimated
                      ? "bg-amber-50/70"
                      : "bg-[#fffaf3]/70"
            }`}
        >
            <td className='w-9 px-2 py-5'>
                <input
                    type='checkbox'
                    className='h-4 w-4 rounded border-[#d9cdbf]'
                />
            </td>
            <td className='px-3 py-5'>
                <div className='flex gap-3'>
                    <span className='mt-1 rounded-lg bg-[#f7eadf] p-2 text-[#bd6845]'>
                        ▣
                    </span>
                    <div>
                        <div className='font-bold text-[#2f2924]'>
                            {line.service}
                        </div>
                        <div className='text-[#8c8074]'>{line.supplier}</div>
                    </div>
                </div>
            </td>
            <td className='px-3 py-5 whitespace-nowrap'>
                <div className='flex items-center gap-3'>
                    <ConfidenceDot line={line} />
                    <div>
                        <div className='font-semibold'>{line.dates}</div>
                        <div className='text-[#8c8074]'>{line.units}</div>
                    </div>
                </div>
            </td>
            <td className='px-3 py-5 text-center'>1</td>
            <td className='px-3 py-5 text-right font-bold'>
                {line.nett === null ? (
                    <span className='text-red-700'>No rate</span>
                ) : (
                    formatMoney(item.effectiveNett)
                )}
            </td>
            <td className='px-3 py-5 text-right font-bold'>
                {formatMoney(item.vatAmount)}
            </td>
            <td className='px-3 py-5 text-right text-[#8c8074]'>
                {line.vatPct}%
            </td>
            <td className='px-3 py-5 text-right font-semibold text-[#6b5f54]'>
                {formatMoney(item.costWithVat)}
            </td>
            <td className='px-3 py-5 text-right'>
                <EditablePct
                    label='commission'
                    value={line.commPct}
                    editing={
                        editing?.lineId === line.id &&
                        editing.field === "commPct"
                    }
                    setEditing={(next) =>
                        setEditing(
                            next ? { lineId: line.id, field: "commPct" } : null,
                        )
                    }
                    onChange={(commPct) => onLineChange(line.id, { commPct })}
                />
            </td>
            <td className='px-3 py-5 text-right'>
                <EditablePct
                    label='markup'
                    value={line.mrkpPct}
                    editing={
                        editing?.lineId === line.id &&
                        editing.field === "mrkpPct"
                    }
                    setEditing={(next) =>
                        setEditing(
                            next ? { lineId: line.id, field: "mrkpPct" } : null,
                        )
                    }
                    onChange={(mrkpPct) => onLineChange(line.id, { mrkpPct })}
                    warning={
                        item.isMarkupClamped
                            ? `Pricing uses the ${MIN_MARKUP_PCT}% floor.`
                            : undefined
                    }
                />
                {item.isMarkupClamped ? (
                    <div className='text-[10px] font-semibold text-red-700'>
                        floored at {MIN_MARKUP_PCT}%
                    </div>
                ) : null}
            </td>
            <td className='px-3 py-5 text-right text-lg font-extrabold'>
                {formatMoney(item.clientPays)}
            </td>
            <td className='px-3 py-5 text-right font-bold text-emerald-700'>
                <div>{formatMoney(item.grossProfit)}</div>
                <div className='text-xs text-[#8c8074]'>
                    {item.grossProfitPct === null
                        ? "—"
                        : pct.format(item.grossProfitPct)}
                </div>
            </td>
            <td className='min-w-[300px] px-3 py-5'>
                <div className='font-semibold'>{line.rate.note}</div>
                <div className='mt-1 text-[#8c8074]'>
                    Source:{" "}
                    <span className='font-bold text-emerald-700'>
                        {line.rate.document}
                    </span>{" "}
                    · Confidence:{" "}
                    <span className='font-bold text-emerald-700'>
                        {line.rate.confidence}
                    </span>
                </div>
                {line.nett === null ? (
                    <label className='mt-3 flex items-center gap-2 text-xs font-bold text-amber-800'>
                        <input
                            type='checkbox'
                            checked={estimatedNetts[line.id] !== undefined}
                            onChange={(e) =>
                                setEstimatedNetts((prev) =>
                                    e.target.checked
                                        ? { ...prev, [line.id]: 0 }
                                        : Object.fromEntries(
                                              Object.entries(prev).filter(
                                                  ([id]) => id !== line.id,
                                              ),
                                          ),
                                )
                            }
                        />{" "}
                        Use temporary nett{" "}
                        <input
                            disabled={estimatedNetts[line.id] === undefined}
                            type='number'
                            min='0'
                            className='w-24 rounded border px-2 py-1'
                            value={estimatedNetts[line.id] ?? ""}
                            onChange={(e) =>
                                setEstimatedNetts((prev) => ({
                                    ...prev,
                                    [line.id]: Math.max(
                                        0,
                                        Number(e.target.value),
                                    ),
                                }))
                            }
                        />
                    </label>
                ) : null}
            </td>
        </tr>
    );
}

export default function PricingTable({
    quote: initialQuote,
}: {
    quote: Quote;
}) {
    const [quote, setQuote] = useState(initialQuote);
    const [editing, setEditing] = useState<EditingCell>(null);
    const [estimatedNetts, setEstimatedNetts] = useState<
        Record<string, number>
    >({});
    const pricing = useMemo(
        () => calculateQuote(quote, estimatedNetts),
        [quote, estimatedNetts],
    );
    const progress = Math.min(
        100,
        Math.max(4, (pricing.clientPays / quote.clientCeiling) * 100),
    );
    const onLineChange = (lineId: string, patch: Partial<LineItem>) =>
        setQuote((current) => ({
            ...current,
            lines: current.lines.map((line) =>
                line.id === lineId ? { ...line, ...patch } : line,
            ),
        }));

    return (
        <main className='min-h-screen bg-[#efe6d8] p-6 text-[13px] text-[#332d28]'>
            <section className='rounded-2xl border border-[#e2d6c8] bg-[#fffaf3] p-6 shadow-sm'>
                <div className='flex items-center justify-between'>
                    <div>
                        <h1 className='font-serif text-3xl font-bold'>
                            New proposal
                        </h1>
                        <p className='text-lg font-semibold text-[#8c8074]'>
                            {quote.client} · {quote.trip} · {quote.dates} · via{" "}
                            {quote.advisor}
                        </p>
                    </div>
                    <div className='flex gap-2'>
                        <button className='rounded-lg border px-5 py-3 font-bold'>
                            Back
                        </button>
                        <button className='rounded-lg bg-[#bd6845] px-5 py-3 font-bold text-white'>
                            Next: Design
                        </button>
                    </div>
                </div>
                <div className='mt-6 grid grid-cols-5 gap-2'>
                    {["Brief", "Plan", "Price", "Design", "Review & Send"].map(
                        (step, index) => (
                            <div
                                key={step}
                                className={`rounded-xl border p-4 ${index === 2 ? "border-[#bd6845] bg-[#f3dfd5]" : index > 2 ? "opacity-45" : "bg-white"}`}
                            >
                                <div className='text-[11px] font-bold uppercase tracking-[0.2em] text-[#b0a497]'>
                                    Step {index + 1}
                                </div>
                                <div className='text-lg font-extrabold'>
                                    {index < 2
                                        ? "✓ "
                                        : index === 2
                                          ? "● "
                                          : "○ "}
                                    {step}
                                </div>
                            </div>
                        ),
                    )}
                </div>
                <div className='mt-6 border-t pt-5'>
                    <div className='flex justify-between text-lg font-bold'>
                        <span>
                            <span className='uppercase tracking-[0.2em]'>
                                Budget
                            </span>{" "}
                            client ceiling: {quote.currency}{" "}
                            {exactMoney.format(quote.clientCeiling)} · you are{" "}
                            {pricing.budgetStatus === "over"
                                ? `$${money.format(pricing.overBudgetBy)} above`
                                : `$${money.format(pricing.underBudgetBy)} under`}
                        </span>
                        <span>
                            NETT {formatMoney(pricing.nett)} · VAT{" "}
                            {formatMoney(pricing.vatAmount)} · GP{" "}
                            {formatMoney(pricing.grossProfit)} ·{" "}
                            <span className='text-emerald-700'>
                                {pct.format(pricing.grossProfitPct)}
                            </span>
                        </span>
                    </div>
                    <div className='relative mt-4 h-8 overflow-hidden rounded-full bg-[#e6ded5]'>
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${pricing.budgetStatus === "over" ? "from-amber-200 to-red-500" : "from-[#d8d0c8] to-[#bd6845]"}`}
                            style={{ width: `${progress}%` }}
                        />
                        <div className='absolute left-4 top-1.5 font-extrabold'>
                            {formatMoney(pricing.clientPays)} client price
                        </div>
                        <div className='absolute right-4 top-1.5 font-bold'>
                            ceiling {formatMoney(quote.clientCeiling)}
                        </div>
                    </div>
                    {pricing.budgetStatus === "over" ? (
                        <div className='mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-800'>
                            Over budget: reduce discretionary activities,
                            replace high-variance alternatives, or request
                            approval before advancing.
                        </div>
                    ) : null}
                </div>
            </section>

            <section className='mt-6 overflow-hidden rounded-3xl border border-[#e2d6c8] bg-[#fffaf3] shadow-sm'>
                <div className='flex items-center justify-between border-b px-5 py-4'>
                    <div className='flex gap-2'>
                        <span className='rounded-full bg-[#bd6845] px-5 py-2 font-bold text-white'>
                            Itemized
                        </span>
                        <span className='rounded-full border px-5 py-2 font-bold'>
                            Ranges
                        </span>
                        <span className='rounded-full border px-5 py-2 font-bold'>
                            Set pax · {quote.pax}
                        </span>
                        <span className='rounded-full border px-5 py-2 font-bold'>
                            {quote.currency}
                        </span>
                    </div>
                    <button
                        className='rounded-full border px-5 py-2 font-bold'
                        onClick={() => setQuote(initialQuote)}
                    >
                        Reset markups
                    </button>
                </div>
                <div className='overflow-x-auto'>
                    <table className='w-full border-collapse'>
                        <thead>
                            <tr className='border-b bg-[#fffaf3] text-left text-[11px] uppercase tracking-[0.18em] text-[#6f655d]'>
                                <th />
                                <th className='px-3 py-4'>
                                    Service / Supplier
                                </th>
                                <th className='px-3 py-4'>Dates</th>
                                <th className='px-3 py-4 text-center'>U.</th>
                                <th className='px-3 py-4 text-right'>Nett</th>
                                <th className='px-3 py-4 text-right'>VAT</th>
                                <th className='px-3 py-4 text-right'>VAT%</th>
                                <th className='px-3 py-4 text-right'>
                                    Cost + VAT
                                </th>
                                <th className='px-3 py-4 text-right'>Comm.</th>
                                <th className='px-3 py-4 text-right'>Mrkp.</th>
                                <th className='px-3 py-4 text-right'>
                                    Client pays
                                </th>
                                <th className='px-3 py-4 text-right'>GP</th>
                                <th className='px-3 py-4'>Reasoning</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pricing.sections.map((section) => (
                                <React.Fragment key={section.section}>
                                    <tr className='bg-[#ebe3d9]'>
                                        <td
                                            colSpan={13}
                                            className='px-3 py-3 font-extrabold'
                                        >
                                            ⌄ {section.section}{" "}
                                            <span className='text-[#8c8074]'>
                                                ({section.lines.length})
                                            </span>
                                            <span className='float-right font-semibold text-[#8c8074]'>
                                                {formatMoney(section.nett)} nett
                                                ·{" "}
                                                {formatMoney(
                                                    section.clientPays,
                                                )}{" "}
                                                client ·{" "}
                                                {pct.format(
                                                    section.grossProfitPct,
                                                )}{" "}
                                                margin
                                            </span>
                                        </td>
                                    </tr>
                                    {section.lines.map((line) => (
                                        <Row
                                            key={line.line.id}
                                            item={line}
                                            onLineChange={onLineChange}
                                            editing={editing}
                                            setEditing={setEditing}
                                            estimatedNetts={estimatedNetts}
                                            setEstimatedNetts={
                                                setEstimatedNetts
                                            }
                                        />
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    );
}
