import { parseDateString } from "../src/crawler.js";

import { useFakeTimers } from "sinon";
import { expect } from "chai";

describe("parseDateString", function () {
  before(function () {
    this.clock = useFakeTimers(new Date("2025-05-05T16:00:00"));
  });

  after(function () {
    this.clock.restore();
  });

  it("should parse '15:30'", function () {
    const result = parseDateString("15:30");
    expect(result).to.eql(new Date("2025-05-05T15:30:00"));
  });

  it("should parse '어제 12:41'", function () {
    const result = parseDateString("어제 12:41");
    expect(result).to.eql(new Date("2025-05-04T12:41:00"));
  });

  it("should parse '05.02 16:50'", function () {
    const result = parseDateString("05.02 16:50");
    expect(result).to.eql(new Date("2025-05-02T16:50:00"));
  });
});
