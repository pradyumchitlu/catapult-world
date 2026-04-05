from manim import *

# Veridex brand colors
VERIDEX_BLUE = "#2563EB"
VERIDEX_LIGHT_BLUE = "#3B82F6"
VERIDEX_POWDER = "#DBEAFE"
VERIDEX_DARK = "#1E293B"
VERIDEX_MUTED = "#94A3B8"
VERIDEX_SUCCESS = "#10B981"
VERIDEX_WARNING = "#F59E0B"
VERIDEX_ROSE = "#F43F5E"
VERIDEX_CYAN = "#0EA5E9"

# Fonts
FONT_HEADING = "Fraunces"
FONT_BODY = "Inter"


class VeridexIntro(Scene):
    """Opening title card with Veridex branding."""

    def construct(self):
        self.camera.background_color = VERIDEX_POWDER

        logo = Text(
            "Veridex",
            font=FONT_HEADING,
            font_size=96,
            weight=BOLD,
            slant=ITALIC,
        )
        logo.set_color_by_gradient(VERIDEX_BLUE, VERIDEX_LIGHT_BLUE)

        tagline = Text(
            "Portable, Stake-Backed Trust",
            font=FONT_BODY,
            font_size=28,
            color=VERIDEX_MUTED,
        )
        tagline.next_to(logo, DOWN, buff=0.5)

        self.play(Write(logo), run_time=1.5)
        self.play(FadeIn(tagline, shift=UP * 0.3), run_time=0.8)
        self.wait(2)
        self.play(FadeOut(Group(logo, tagline)), run_time=0.8)


class TrustProblem(Scene):
    """Illustrates the problem: reputation doesn't travel between platforms."""

    def construct(self):
        self.camera.background_color = VERIDEX_POWDER

        title = Text("The Problem", font=FONT_HEADING, font_size=42, color=VERIDEX_DARK, weight=BOLD)
        title.to_edge(UP, buff=0.8)
        self.play(Write(title), run_time=0.6)

        # Platform silos
        platforms = ["Upwork", "Fiverr", "GitHub", "LinkedIn"]
        platform_groups = []

        for i, name in enumerate(platforms):
            box = RoundedRectangle(
                width=2.2, height=2.8, corner_radius=0.2,
                fill_color=WHITE, fill_opacity=0.6,
                stroke_color=VERIDEX_BLUE, stroke_width=1.5,
            )
            label = Text(name, font=FONT_BODY, font_size=18, color=VERIDEX_DARK, weight=BOLD)
            stars = VGroup(*[
                Star(n=5, outer_radius=0.12, inner_radius=0.06, fill_opacity=1, color=VERIDEX_WARNING)
                for _ in range(3)
            ]).arrange(RIGHT, buff=0.1)
            reviews = Text("47 reviews", font=FONT_BODY, font_size=14, color=VERIDEX_MUTED)

            label.move_to(box.get_top() + DOWN * 0.5)
            stars.move_to(box.get_center())
            reviews.move_to(box.get_center() + DOWN * 0.5)

            group = VGroup(box, label, stars, reviews)
            platform_groups.append(group)

        row = VGroup(*platform_groups).arrange(RIGHT, buff=0.5)
        row.move_to(ORIGIN + DOWN * 0.3)

        self.play(LaggedStart(*[FadeIn(g, shift=UP * 0.3) for g in platform_groups], lag_ratio=0.15), run_time=1.2)
        self.wait(0.5)

        # Show walls between them
        walls = []
        for i in range(len(platform_groups) - 1):
            wall = Line(
                platform_groups[i].get_right() + RIGHT * 0.1 + UP * 0.3,
                platform_groups[i].get_right() + RIGHT * 0.1 + DOWN * 1.5,
                stroke_width=4, color=VERIDEX_ROSE,
            )
            walls.append(wall)

        self.play(*[Create(w) for w in walls], run_time=0.6)

        locked = Text(
            "Reputation is locked inside each platform",
            font=FONT_BODY, font_size=22, color=VERIDEX_ROSE,
        )
        locked.to_edge(DOWN, buff=0.8)
        self.play(FadeIn(locked, shift=UP * 0.2), run_time=0.6)
        self.wait(2)
        self.play(FadeOut(Group(title, row, *walls, locked)), run_time=0.8)


class HowVeridexWorks(Scene):
    """4-step flow: Verify -> Score -> Stake -> Evaluate."""

    def construct(self):
        self.camera.background_color = VERIDEX_POWDER

        title = Text("How Veridex Works", font=FONT_HEADING, font_size=42, color=VERIDEX_DARK, weight=BOLD)
        title.to_edge(UP, buff=0.6)
        self.play(Write(title), run_time=0.6)

        steps = [
            ("01", "Verify", "Prove you're human\nwith World ID", VERIDEX_BLUE),
            ("02", "Score", "Compute trust from\nverified signals", VERIDEX_LIGHT_BLUE),
            ("03", "Stake", "Others vouch for you\nwith real WLD", VERIDEX_SUCCESS),
            ("04", "Evaluate", "Employers assess fit\nwith AI grounded in data", VERIDEX_CYAN),
        ]

        step_groups = []
        for num, name, desc, color in steps:
            circle = Circle(radius=0.55, fill_color=color, fill_opacity=0.15, stroke_color=color, stroke_width=2.5)
            num_text = Text(num, font=FONT_HEADING, font_size=20, color=color, weight=BOLD)
            num_text.move_to(circle)

            label = Text(name, font=FONT_HEADING, font_size=22, color=VERIDEX_DARK, weight=BOLD)
            label.next_to(circle, DOWN, buff=0.3)

            description = Text(desc, font=FONT_BODY, font_size=14, color=VERIDEX_MUTED, line_spacing=1.2)
            description.next_to(label, DOWN, buff=0.2)

            group = VGroup(circle, num_text, label, description)
            step_groups.append(group)

        row = VGroup(*step_groups).arrange(RIGHT, buff=1.0)
        row.move_to(ORIGIN + DOWN * 0.3)

        # Arrows between steps
        arrows = []
        for i in range(len(step_groups) - 1):
            arrow = Arrow(
                step_groups[i].get_right() + LEFT * 0.3,
                step_groups[i + 1].get_left() + RIGHT * 0.3,
                buff=0.15, stroke_width=2, color=VERIDEX_MUTED,
                max_tip_length_to_length_ratio=0.2,
            )
            arrows.append(arrow)

        for i, (group, arrow) in enumerate(zip(step_groups, arrows + [None])):
            self.play(FadeIn(group, shift=UP * 0.3), run_time=0.5)
            if arrow:
                self.play(Create(arrow), run_time=0.3)

        self.wait(2.5)
        self.play(FadeOut(Group(title, row, *arrows)), run_time=0.8)


class TrustScoreBreakdown(Scene):
    """Animated trust score with component breakdown."""

    def construct(self):
        self.camera.background_color = VERIDEX_POWDER

        title = Text("Trust Score", font=FONT_HEADING, font_size=42, color=VERIDEX_DARK, weight=BOLD)
        title.to_edge(UP, buff=0.6)
        self.play(Write(title), run_time=0.6)

        # Score ring
        score_value = 78
        ring_bg = Circle(radius=1.3, stroke_width=12, stroke_color=ManimColor(VERIDEX_BLUE).interpolate(WHITE, 0.85))
        ring_bg.set_fill(opacity=0)

        ring = Arc(
            radius=1.3, start_angle=PI / 2,
            angle=-(score_value / 100) * TAU,
            stroke_width=12, stroke_color=VERIDEX_BLUE,
        )

        score_text = Text(str(score_value), font=FONT_HEADING, font_size=64, color=VERIDEX_BLUE, weight=BOLD)
        score_label = Text("Trust Score", font=FONT_BODY, font_size=18, color=VERIDEX_MUTED)
        score_label.next_to(score_text, DOWN, buff=0.15)

        ring_group = VGroup(ring_bg, ring, score_text, score_label)
        ring_group.move_to(LEFT * 3 + DOWN * 0.3)

        self.play(Create(ring_bg), run_time=0.4)
        self.play(Create(ring), run_time=1.0)
        self.play(FadeIn(score_text), FadeIn(score_label), run_time=0.5)

        # Component bars
        components = [
            ("Identity", 92, VERIDEX_SUCCESS),
            ("Evidence", 85, VERIDEX_BLUE),
            ("Consistency", 78, VERIDEX_BLUE),
            ("Recency", 70, VERIDEX_LIGHT_BLUE),
            ("Employer Reviews", 65, VERIDEX_WARNING),
            ("Staking", 80, VERIDEX_SUCCESS),
        ]

        bars_group = VGroup()
        for name, value, color in components:
            label = Text(name, font=FONT_BODY, font_size=16, color=VERIDEX_DARK)
            if label.width > 2.0:
                label.stretch_to_fit_width(2.0)

            bar_bg = RoundedRectangle(
                width=3.5, height=0.22, corner_radius=0.11,
                fill_color=WHITE, fill_opacity=0.5,
                stroke_width=0,
            )
            bar_fill = RoundedRectangle(
                width=3.5 * (value / 100), height=0.22, corner_radius=0.11,
                fill_color=color, fill_opacity=0.8,
                stroke_width=0,
            )
            bar_fill.align_to(bar_bg, LEFT)

            score_num = Text(str(value), font=FONT_HEADING, font_size=14, color=color, weight=BOLD)

            row = VGroup(label, VGroup(bar_bg, bar_fill), score_num)
            if label.width > 1.8:
                label.scale(1.8 / label.width)
            row.arrange(RIGHT, buff=0.25)
            bars_group.add(row)

        bars_group.arrange(DOWN, buff=0.25, aligned_edge=LEFT)
        bars_group.move_to(RIGHT * 2.2 + DOWN * 0.3)

        self.play(
            LaggedStart(*[FadeIn(b, shift=RIGHT * 0.2) for b in bars_group], lag_ratio=0.1),
            run_time=1.5,
        )

        self.wait(2.5)
        self.play(FadeOut(Group(title, ring_group, bars_group)), run_time=0.8)


class StakingMechanism(Scene):
    """Visualizes how staking creates skin-in-the-game trust."""

    def construct(self):
        self.camera.background_color = VERIDEX_POWDER

        title = Text("Stake-Backed Trust", font=FONT_HEADING, font_size=42, color=VERIDEX_DARK, weight=BOLD)
        title.to_edge(UP, buff=0.6)
        self.play(Write(title), run_time=0.6)

        # Worker in center
        worker_circle = Circle(radius=0.7, fill_color=VERIDEX_BLUE, fill_opacity=0.15, stroke_color=VERIDEX_BLUE, stroke_width=2.5)
        worker_label = Text("Worker", font=FONT_HEADING, font_size=18, color=VERIDEX_BLUE, weight=BOLD)
        worker_score = Text("Score: 78", font=FONT_BODY, font_size=14, color=VERIDEX_MUTED)
        worker_label.move_to(worker_circle.get_center() + UP * 0.15)
        worker_score.move_to(worker_circle.get_center() + DOWN * 0.2)
        worker = VGroup(worker_circle, worker_label, worker_score)
        worker.move_to(ORIGIN)

        self.play(FadeIn(worker), run_time=0.5)

        # Stakers around the worker
        staker_data = [
            ("Alice", "50 WLD", UP * 2 + LEFT * 2),
            ("Bob", "120 WLD", UP * 2 + RIGHT * 2),
            ("Carol", "80 WLD", DOWN * 2 + LEFT * 2),
            ("Dave", "200 WLD", DOWN * 2 + RIGHT * 2),
        ]

        stakers = []
        arrows = []
        for name, amount, pos in staker_data:
            s_circle = Circle(radius=0.45, fill_color=VERIDEX_SUCCESS, fill_opacity=0.1, stroke_color=VERIDEX_SUCCESS, stroke_width=1.5)
            s_name = Text(name, font=FONT_BODY, font_size=14, color=VERIDEX_DARK)
            s_amount = Text(amount, font=FONT_HEADING, font_size=12, color=VERIDEX_SUCCESS, weight=BOLD)
            s_name.move_to(s_circle.get_center() + UP * 0.1)
            s_amount.move_to(s_circle.get_center() + DOWN * 0.15)
            s_group = VGroup(s_circle, s_name, s_amount)
            s_group.move_to(pos)
            stakers.append(s_group)

            arrow = Arrow(
                s_group.get_center(),
                worker_circle.get_center(),
                buff=0.55, stroke_width=2, color=VERIDEX_SUCCESS,
                max_tip_length_to_length_ratio=0.15,
            )
            arrows.append(arrow)

        self.play(
            LaggedStart(*[FadeIn(s, shift=DOWN * 0.2) for s in stakers], lag_ratio=0.1),
            run_time=1.0,
        )
        self.play(
            LaggedStart(*[Create(a) for a in arrows], lag_ratio=0.1),
            run_time=0.8,
        )

        # Total staked
        total = Text("Total Staked: 450 WLD", font=FONT_HEADING, font_size=22, color=VERIDEX_SUCCESS, weight=BOLD)
        total.to_edge(DOWN, buff=0.8)

        explanation = Text(
            "Stakers earn rewards when the worker completes contracts successfully",
            font=FONT_BODY, font_size=16, color=VERIDEX_MUTED,
        )
        explanation.next_to(total, UP, buff=0.3)

        self.play(FadeIn(total, shift=UP * 0.2), run_time=0.5)
        self.play(FadeIn(explanation, shift=UP * 0.2), run_time=0.5)

        self.wait(2.5)
        self.play(FadeOut(Group(title, worker, *stakers, *arrows, total, explanation)), run_time=0.8)


class ContractFlow(Scene):
    """Shows the contract lifecycle: Draft -> Active -> Submitted -> Completed."""

    def construct(self):
        self.camera.background_color = VERIDEX_POWDER

        title = Text("Contract Lifecycle", font=FONT_HEADING, font_size=42, color=VERIDEX_DARK, weight=BOLD)
        title.to_edge(UP, buff=0.6)
        self.play(Write(title), run_time=0.6)

        stages = [
            ("Draft", "Contract created\nby employer", VERIDEX_MUTED),
            ("Active", "Funds escrowed\nWork begins", VERIDEX_BLUE),
            ("Submitted", "Worker submits\ndeliverables", "#8B5CF6"),
            ("Completed", "Employer approves\nFunds released", VERIDEX_SUCCESS),
        ]

        stage_groups = []
        for name, desc, color in stages:
            box = RoundedRectangle(
                width=2.5, height=1.8, corner_radius=0.15,
                fill_color=color, fill_opacity=0.08,
                stroke_color=color, stroke_width=2,
            )
            label = Text(name, font=FONT_HEADING, font_size=20, color=color, weight=BOLD)
            label.move_to(box.get_center() + UP * 0.3)
            description = Text(desc, font=FONT_BODY, font_size=13, color=VERIDEX_MUTED, line_spacing=1.2)
            description.move_to(box.get_center() + DOWN * 0.25)

            group = VGroup(box, label, description)
            stage_groups.append(group)

        row = VGroup(*stage_groups).arrange(RIGHT, buff=0.6)
        row.move_to(ORIGIN + DOWN * 0.2)

        arrows = []
        for i in range(len(stage_groups) - 1):
            arrow = Arrow(
                stage_groups[i].get_right(),
                stage_groups[i + 1].get_left(),
                buff=0.1, stroke_width=2.5, color=VERIDEX_MUTED,
                max_tip_length_to_length_ratio=0.2,
            )
            arrows.append(arrow)

        for i, group in enumerate(stage_groups):
            self.play(FadeIn(group, shift=UP * 0.3), run_time=0.4)
            if i < len(arrows):
                self.play(Create(arrows[i]), run_time=0.25)

        # Payment split
        split_title = Text("Payment Split", font=FONT_HEADING, font_size=18, color=VERIDEX_DARK, weight=BOLD)
        split_title.to_edge(DOWN, buff=1.6)

        splits = VGroup(
            Text("Worker: Salary", font=FONT_BODY, font_size=15, color=VERIDEX_SUCCESS),
            Text("  |  ", font=FONT_BODY, font_size=15, color=VERIDEX_MUTED),
            Text("Stakers: Reward", font=FONT_BODY, font_size=15, color=VERIDEX_CYAN),
            Text("  |  ", font=FONT_BODY, font_size=15, color=VERIDEX_MUTED),
            Text("Platform: 3% Fee", font=FONT_BODY, font_size=15, color=VERIDEX_MUTED),
        ).arrange(RIGHT, buff=0.05)
        splits.next_to(split_title, DOWN, buff=0.25)

        self.play(FadeIn(split_title), FadeIn(splits), run_time=0.6)
        self.wait(2.5)
        self.play(FadeOut(Group(title, row, *arrows, split_title, splits)), run_time=0.8)


class AgentIdentity(Scene):
    """Shows how AI agents derive trust from verified humans."""

    def construct(self):
        self.camera.background_color = VERIDEX_POWDER

        title = Text("Agent Identity", font=FONT_HEADING, font_size=42, color=VERIDEX_DARK, weight=BOLD)
        title.to_edge(UP, buff=0.6)
        self.play(Write(title), run_time=0.6)

        # Human
        human_circle = Circle(radius=0.8, fill_color=VERIDEX_BLUE, fill_opacity=0.12, stroke_color=VERIDEX_BLUE, stroke_width=2.5)
        human_label = Text("Verified\nHuman", font=FONT_HEADING, font_size=16, color=VERIDEX_BLUE, weight=BOLD, line_spacing=1.1)
        human_score = Text("Score: 85", font=FONT_BODY, font_size=14, color=VERIDEX_MUTED)
        human_label.move_to(human_circle.get_center() + UP * 0.1)
        human_score.move_to(human_circle.get_center() + DOWN * 0.35)
        human = VGroup(human_circle, human_label, human_score)
        human.move_to(LEFT * 3.5)

        self.play(FadeIn(human), run_time=0.5)

        # Arrow showing derivation
        derive_arrow = Arrow(
            LEFT * 2.3, RIGHT * 0.2,
            stroke_width=3, color=VERIDEX_LIGHT_BLUE,
            max_tip_length_to_length_ratio=0.12,
        )
        derive_label = Text("70% delegation", font=FONT_BODY, font_size=14, color=VERIDEX_LIGHT_BLUE)
        derive_label.next_to(derive_arrow, UP, buff=0.15)

        self.play(Create(derive_arrow), FadeIn(derive_label), run_time=0.6)

        # Agents
        agent_data = [
            ("Shopping\nAgent", "59"),
            ("Research\nAgent", "59"),
        ]

        agents = []
        for i, (name, score) in enumerate(agent_data):
            a_circle = Circle(radius=0.65, fill_color=VERIDEX_CYAN, fill_opacity=0.1, stroke_color=VERIDEX_CYAN, stroke_width=2)
            a_label = Text(name, font=FONT_BODY, font_size=13, color=VERIDEX_DARK, line_spacing=1.1)
            a_score = Text(f"Score: {score}", font=FONT_HEADING, font_size=12, color=VERIDEX_CYAN, weight=BOLD)
            a_label.move_to(a_circle.get_center() + UP * 0.1)
            a_score.move_to(a_circle.get_center() + DOWN * 0.3)
            a_group = VGroup(a_circle, a_label, a_score)
            a_group.move_to(RIGHT * 2.5 + (UP if i == 0 else DOWN) * 1.3)
            agents.append(a_group)

        self.play(LaggedStart(*[FadeIn(a, shift=LEFT * 0.3) for a in agents], lag_ratio=0.15), run_time=0.8)

        # Verification endpoint
        api_box = RoundedRectangle(
            width=4.5, height=1.2, corner_radius=0.12,
            fill_color=ManimColor("#0F172A"), fill_opacity=0.95,
            stroke_width=0,
        )
        api_text = Text(
            "GET /api/agent/:id\n-> parent: Verified Human (85)",
            font_size=13, color=ManimColor("#E2E8F0"), line_spacing=1.3,
        )
        api_text.move_to(api_box)
        api_group = VGroup(api_box, api_text)
        api_group.to_edge(DOWN, buff=0.7)

        api_label = Text("Public Verification API", font=FONT_HEADING, font_size=16, color=VERIDEX_DARK, weight=BOLD)
        api_label.next_to(api_group, UP, buff=0.25)

        self.play(FadeIn(api_label), FadeIn(api_group, shift=UP * 0.2), run_time=0.6)

        self.wait(2.5)
        self.play(FadeOut(Group(title, human, derive_arrow, derive_label, *agents, api_label, api_group)), run_time=0.8)


class VeridexOutro(Scene):
    """Closing card."""

    def construct(self):
        self.camera.background_color = VERIDEX_POWDER

        logo = Text(
            "Veridex",
            font=FONT_HEADING,
            font_size=80,
            weight=BOLD,
            slant=ITALIC,
        )
        logo.set_color_by_gradient(VERIDEX_BLUE, VERIDEX_LIGHT_BLUE)

        tagline = Text(
            "Trust, verified.",
            font=FONT_HEADING,
            font_size=32,
            color=VERIDEX_DARK,
            slant=ITALIC,
        )
        tagline.next_to(logo, DOWN, buff=0.4)

        built = Text(
            "Built for World Chain",
            font=FONT_BODY,
            font_size=18,
            color=VERIDEX_MUTED,
        )
        built.next_to(tagline, DOWN, buff=0.6)

        self.play(FadeIn(logo, shift=UP * 0.3), run_time=1.0)
        self.play(FadeIn(tagline, shift=UP * 0.2), run_time=0.6)
        self.play(FadeIn(built, shift=UP * 0.2), run_time=0.5)
        self.wait(3)
