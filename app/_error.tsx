import { NextPage } from 'next'

interface ErrorProps {
  statusCode?: number
  hasGetInitialProps?: boolean
  err?: Error
}

const Error: NextPage<ErrorProps> = ({ statusCode, hasGetInitialProps, err }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          {statusCode ? `An error ${statusCode} occurred on server` : 'An error occurred on client'}
        </h1>
        <p className="text-muted-foreground">
          {hasGetInitialProps ? 'A server-side error occurred' : 'A client-side error occurred'}
        </p>
        {err && (
          <p className="text-sm text-muted-foreground mt-2">
            {err.message}
          </p>
        )}
      </div>
    </div>
  )
}

Error.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404
  return { statusCode }
}

export default Error 