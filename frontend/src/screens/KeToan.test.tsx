import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { BalanceSheetStatus } from "./KeToan.js"

describe("BalanceSheetStatus", () => {
  it("shows the balanced confirmation when canDoi is true", () => {
    render(<BalanceSheetStatus canDoi tongTaiSan={1_000_000} tongNguonVon={1_000_000} chenhLech={0} />)
    expect(screen.getByText("Bảng cân đối kế toán cân bằng")).toBeInTheDocument()
    expect(screen.queryByText(/đang lệch/)).not.toBeInTheDocument()
  })

  it("shows the discrepancy amount when assets exceed liabilities + equity", () => {
    render(<BalanceSheetStatus canDoi={false} tongTaiSan={1_500_000} tongNguonVon={1_200_000} chenhLech={300_000} />)
    expect(screen.getByText("Bảng cân đối kế toán đang lệch 300.000 VNĐ")).toBeInTheDocument()
    expect(screen.getByText(/>/)).toBeInTheDocument()
  })

  it("shows the discrepancy with the opposite comparison when liabilities + equity exceed assets", () => {
    render(<BalanceSheetStatus canDoi={false} tongTaiSan={800_000} tongNguonVon={1_000_000} chenhLech={-200_000} />)
    // Math.abs — the headline amount is always positive regardless of sign.
    expect(screen.getByText("Bảng cân đối kế toán đang lệch 200.000 VNĐ")).toBeInTheDocument()
    expect(screen.getByText(/</)).toBeInTheDocument()
  })
})
