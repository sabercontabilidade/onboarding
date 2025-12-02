import { Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="h-svh w-full overflow-hidden relative bg-white">
      {/* Background com onda laranja */}
      <div className="absolute top-0 left-0 w-full h-[50vh] z-0">
        <div className="absolute inset-0 bg-gradient-to-r from-[#EA610B] via-orange-500 to-[#F5A623]" />
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 120" preserveAspectRatio="none" style={{ height: '80px' }}>
          <path d="M0,50 Q200,100 400,65 Q900,0 1440,90 L1440,120 L0,120 Z" fill="white" />
        </svg>
      </div>

      {/* Conteúdo centralizado */}
      <div className="absolute inset-0 flex items-center justify-center px-4 z-10">
        <Card className="w-full max-w-md bg-white rounded-xl shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
              <span className="text-5xl font-bold text-[#EA610B]">404</span>
            </div>
            <CardTitle className="text-2xl text-foreground">Página Não Encontrada</CardTitle>
            <CardDescription className="text-base mt-2">
              A página que você está procurando não existe ou foi movida.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">O que pode ter acontecido?</p>
                  <ul className="list-disc list-inside space-y-1 text-orange-700">
                    <li>O endereço foi digitado incorretamente</li>
                    <li>A página foi removida ou renomeada</li>
                    <li>Você não tem permissão para acessar</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Link href="/">
                <Button className="w-full bg-[#EA610B] hover:bg-orange-600 text-white">
                  <Home className="mr-2 h-4 w-4" />
                  Ir para o Início
                </Button>
              </Link>
              <Button
                variant="outline"
                className="w-full hover:bg-orange-50 hover:text-[#EA610B] hover:border-[#EA610B]"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar à Página Anterior
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
