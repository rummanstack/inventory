import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled application error:', error, errorInfo);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="page-shell">
        <div className="mx-auto flex min-h-screen max-w-2xl items-center justify-center px-6">
          <div className="flex min-h-52 w-full flex-col items-center justify-center rounded-card border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
            <div className="rounded-control bg-white p-3 text-rose-600 shadow-crisp ring-1 ring-slate-200">
              <AlertTriangle size={24} />
            </div>
            <h3 className="mt-4 text-base font-bold text-slate-900">{this.props.t ? this.props.t('errors.somethingWentWrong') : 'Something went wrong'}</h3>
            <p className="mt-1 max-w-md text-sm font-medium text-slate-500">
              {this.props.t ? this.props.t('errors.unexpectedError') : 'An unexpected error occurred. Try reloading the page.'}
            </p>
            <button type="button" className="btn-primary mt-5" onClick={() => window.location.reload()}>
              {this.props.t ? this.props.t('common.reload') : 'Reload'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}
