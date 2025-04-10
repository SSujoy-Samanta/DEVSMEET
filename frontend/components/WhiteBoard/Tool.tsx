import React from "react";

export const Tool = ({
  name,
  value,
  setTool,
  type,
  tool,
}: {
  name: string;
  value: string;
  setTool: React.Dispatch<React.SetStateAction<string>>;
  type: string;
  tool: string;
}) => {
  return (
    <div className="flex justify-center items-center gap-1">
      <label
        htmlFor={name}
        className="cursor-pointer text-cyan-500 font-bold"
      >
        {name}
      </label>

      <input
        id={name} 
        name={name}
        type={type}
        value={value}
        checked={tool.toLowerCase() === name.toLowerCase()}
        onChange={(e) => setTool(e.target.value)}
        className="cursor-pointer"
      />
    </div>
  );
};
