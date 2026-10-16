'use client'

import React from 'react'

// Downloads the table on the page as a .csv file that Excel and Google Sheets open.
export function DownloadCsv({ rows, fileName, label }: { rows: string[][]; fileName: string; label: string }) {
  const download = () => {
    const cell = (c: string) => {
      // A leading = + - @ would make Excel treat the cell as a formula.
      const safe = /^[=+\-@]/.test(c) ? `'${c}` : c
      return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
    }
    const text = '﻿' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <button type="button" onClick={download} className="cg-tools__btn">
      {label}
    </button>
  )
}
