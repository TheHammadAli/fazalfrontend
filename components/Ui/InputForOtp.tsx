"use client";
import React, { useState } from "react";
import OtpInput from "react-otp-input";
type InputForOtpProps = {
  otp: string;
  setOtp: (value: string) => void;
};

function InputForOtp({ otp, setOtp }: InputForOtpProps) {
  return (
    <OtpInput
      containerStyle={"gap-2 md:gap-3"}
      inputStyle={
        "h-[44px] md:h-[54px] w-[40px] min-w-[40px] md:w-[52px] md:min-w-[52px] outline-none border border-gray-9 rounded-[12px] text-[16px] font-medium text-black-1 text-center transition-colors duration-150 focus:border-green-1 focus:ring-2 focus:ring-green-1/25"
      }
      value={otp}
      onChange={setOtp}
      numInputs={6}
      inputType="tel"
      renderSeparator={false}
      renderInput={(props) => <input {...props} />}
    />
  );
}

export default InputForOtp;
