using Nexo.Server.Modules.Core.CompanyContext;
using Nexo.Server.Modules.Core.ModuleGating;
using Nexo.Server.Modules.Restaurant.Authorization;
using TUnit.Assertions;
using TUnit.Core;

namespace Nexo.Server.Tests.Modules.Restaurant.Authorization;

public sealed class RestaurantAccessServiceTests
{
    [Test]
    public async Task RequireAsync_DeniesAccess_WhenRestaurantModuleIsInactive()
    {
        var companyId = Guid.Parse("22222222-2222-7222-8222-222222222222");
        var moduleGate = new RecordingModuleGate(ModuleGateResult.Inactive());
        var permissions = new RecordingRestaurantPermissionAuthorizer(RestaurantPermissionResult.Allowed());
        var service = new RestaurantAccessService(
            new FixedCompanyContextProvider(companyId),
            moduleGate,
            permissions);

        var result = await service.RequireAsync(RestaurantPermissions.ContextRead);

        await Assert.That(result.Succeeded).IsFalse();
        await Assert.That(result.Failure).IsEqualTo(RestaurantAccessFailure.ModuleInactive);
        await Assert.That(moduleGate.RequestedCompanyId).IsEqualTo(companyId);
        await Assert.That(moduleGate.RequestedModuleKey).IsEqualTo(NexoModules.Restaurant);
        await Assert.That(permissions.InvocationCount).IsEqualTo(0);
    }

    [Test]
    public async Task RequireAsync_InvokesPermissionContract_WhenRestaurantModuleIsActive()
    {
        var companyId = Guid.Parse("33333333-3333-7333-8333-333333333333");
        var moduleGate = new RecordingModuleGate(ModuleGateResult.Active());
        var permissions = new RecordingRestaurantPermissionAuthorizer(RestaurantPermissionResult.Allowed());
        var service = new RestaurantAccessService(
            new FixedCompanyContextProvider(companyId),
            moduleGate,
            permissions);

        var result = await service.RequireAsync(RestaurantPermissions.ContextRead);

        await Assert.That(result.Succeeded).IsTrue();
        await Assert.That(result.CompanyId).IsEqualTo(companyId);
        await Assert.That(permissions.InvocationCount).IsEqualTo(1);
        await Assert.That(permissions.RequestedCompanyId).IsEqualTo(companyId);
        await Assert.That(permissions.RequestedPermission).IsEqualTo(RestaurantPermissions.ContextRead);
    }

    [Test]
    public async Task RequireAsync_DeniesAccess_WhenPermissionContractRejectsAction()
    {
        var companyId = Guid.Parse("44444444-4444-7444-8444-444444444444");
        var service = new RestaurantAccessService(
            new FixedCompanyContextProvider(companyId),
            new RecordingModuleGate(ModuleGateResult.Active()),
            new RecordingRestaurantPermissionAuthorizer(RestaurantPermissionResult.Denied()));

        var result = await service.RequireAsync(RestaurantPermissions.ContextRead);

        await Assert.That(result.Succeeded).IsFalse();
        await Assert.That(result.Failure).IsEqualTo(RestaurantAccessFailure.PermissionDenied);
        await Assert.That(result.CompanyId).IsEqualTo(companyId);
    }

    private sealed class FixedCompanyContextProvider(Guid companyId) : ICompanyContextProvider
    {
        public ValueTask<CompanyContext> GetCurrentAsync(CancellationToken cancellationToken = default)
        {
            return ValueTask.FromResult(new CompanyContext(companyId));
        }
    }

    private sealed class RecordingModuleGate(ModuleGateResult result) : IModuleGate
    {
        public Guid RequestedCompanyId { get; private set; }
        public string? RequestedModuleKey { get; private set; }

        public ValueTask<ModuleGateResult> EnsureActiveAsync(
            Guid companyId,
            string moduleKey,
            CancellationToken cancellationToken = default)
        {
            RequestedCompanyId = companyId;
            RequestedModuleKey = moduleKey;

            return ValueTask.FromResult(result);
        }
    }

    private sealed class RecordingRestaurantPermissionAuthorizer(RestaurantPermissionResult result)
        : IRestaurantPermissionAuthorizer
    {
        public int InvocationCount { get; private set; }
        public Guid RequestedCompanyId { get; private set; }
        public string? RequestedPermission { get; private set; }

        public ValueTask<RestaurantPermissionResult> AuthorizeAsync(
            Guid companyId,
            string permission,
            CancellationToken cancellationToken = default)
        {
            InvocationCount++;
            RequestedCompanyId = companyId;
            RequestedPermission = permission;

            return ValueTask.FromResult(result);
        }
    }
}
