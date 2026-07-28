import { TriangleAlert } from "lucide-react";
import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4">
      <TriangleAlert className="h-14 w-14 text-red-400" />

      <h1 className="text-3xl font-semibold">404</h1>

      <p className="text-[#8a85b4]">O caminho informado não existe.</p>

      <Link to="/" className="rounded-lg bg-violet-600 px-4 py-2 text-white">
        Voltar ao início
      </Link>
    </div>
  );
};

export default NotFoundPage;
