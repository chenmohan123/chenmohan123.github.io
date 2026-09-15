import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DetectionComparison from "./DetectionComparison";
import data from "../../data/pp-detection-comparison.json";

describe("Detection 模型选型", () => {
  it("筛选稳定精度并保留批次，不把XS实验量化列入稳定表", () => {
    render(<DetectionComparison data={data} />);
    expect(screen.getByRole("status")).toHaveTextContent("38 个稳定变体");
    fireEvent.change(screen.getByLabelText("模型系列"), {
      target: { value: "picodet" },
    });
    fireEvent.change(screen.getByLabelText("模型精度"), {
      target: { value: "w8a32" },
    });
    expect(screen.getByRole("status")).toHaveTextContent("7 个稳定变体");
    expect(
      screen.queryByRole("row", { name: /PicoDet-XS/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("PicoDet L-320 与 PP-YOLOE+ S")).toBeVisible();
    fireEvent.change(screen.getByLabelText("模型系列"), {
      target: { value: "ppyolo" },
    });
    expect(screen.getByRole("status")).toHaveTextContent("0 个稳定变体");
    fireEvent.change(screen.getByLabelText("模型精度"), {
      target: { value: "fp32" },
    });
    expect(
      screen.getByRole("row", { name: /PP-YOLO Tiny 320 FP32/ }),
    ).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("1 个稳定变体");
    const tiny = screen.getByRole("row", { name: /PP-YOLO Tiny 320 FP32/ });
    expect(within(tiny).getByText("47.46")).toBeVisible();
    expect(within(tiny).getByText("22.60")).toBeVisible();
    expect(within(tiny).getByText("基线")).toBeVisible();
    fireEvent.click(screen.getByRole("radio", { name: "GPU / WebGPU" }));
    expect(within(tiny).getByText("31.54")).toBeVisible();
    fireEvent.change(screen.getByLabelText("模型精度"), {
      target: { value: "fp16" },
    });
    expect(screen.getByRole("status")).toHaveTextContent("0 个稳定变体");
  });

  it("切换后端同时更新AP与耗时，明确不同汇总规则", () => {
    render(<DetectionComparison data={data} />);
    const row = screen.getByRole("row", { name: /PicoDet-XS 320 FP32/ });
    expect(within(row).getByText("64.10")).toBeVisible();
    fireEvent.click(screen.getByRole("radio", { name: "GPU / WebGPU" }));
    expect(within(row).queryByText("64.10")).not.toBeInTheDocument();
    expect(within(row).getByText("36.69")).toBeVisible();
    expect(screen.getByText(/仅第三轮/)).toBeVisible();
    expect(screen.getAllByText(/再取三轮中位数/)).toHaveLength(3);
  });
});
