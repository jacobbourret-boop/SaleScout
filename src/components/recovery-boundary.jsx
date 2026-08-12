import { Component } from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import { Button } from "./ui/button";
import { cn } from "../lib/utils";

export class RecoveryBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, details) {
    console.error("SaleScout recovered from a screen error", error, details);
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { title = "SaleScout needs a quick refresh", description = "Your place is safe. Refresh to reconnect and keep scouting.", fullScreen = false, map = false, overlay = false } = this.props;
    return (
      <section className={cn("error-state feature-recovery", fullScreen && "is-full-screen", map && "is-map", overlay && "is-overlay")} role="alert">
        <span><WarningCircle size={30} weight="duotone" /></span>
        <h2>{title}</h2>
        <p>{description}</p>
        <Button variant="secondary" onClick={() => window.location.reload()}><ArrowClockwise size={18} weight="bold" />Refresh SaleScout</Button>
      </section>
    );
  }
}
