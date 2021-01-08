import React, { useState } from "react";

const Test: React.FC = (props: any) => {
  const [routes, setRoutes] = useState([...props.routes]);
  return (
    <div>
      {routes.map((prop: any, key: any) => {
        <div>{prop.name}</div>;
      })}
    </div>
  );
};

export default Test;
